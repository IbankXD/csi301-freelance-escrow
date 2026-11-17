
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FreelanceEscrow {

    // ผู้ดูแลระบบ
    address public immutable admin;

    // สถานะของข้อตกลง
    enum Status {
        Created,
        Funded,
        Submitted,
        Disputed,
        Completed,
        Refunded
    }

    // ข้อมูลข้อตกลง
    struct Agreement {
        uint256 id;
        address employer;
        address freelancer;
        string projectName;
        string description;
        uint256 amount;
        uint256 deadline;
        string workProof;
        Status status;
        uint256 createdAt;
    }

    // เก็บข้อตกลงทั้งหมด
    mapping(uint256 => Agreement) private agreements;

    uint256 public nextAgreementId = 1;

    // ป้องกัน Reentrancy
    uint256 private lock = 1;

    modifier nonReentrant() {
        require(lock == 1, "Reentrancy detected");
        lock = 2;
        _;
        lock = 1;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier agreementExists(uint256 _id) {
        require(
            _id > 0 && _id < nextAgreementId,
            "Agreement does not exist"
        );
        _;
    }

    // Events สำหรับติดตามธุรกรรม
    event AgreementCreated(
        uint256 indexed id,
        address indexed employer,
        address indexed freelancer,
        uint256 amount
    );

    event PaymentDeposited(
        uint256 indexed id,
        uint256 amount
    );

    event WorkSubmitted(
        uint256 indexed id,
        string workProof
    );

    event PaymentReleased(
        uint256 indexed id,
        address indexed freelancer,
        uint256 amount
    );

    event DisputeRaised(
        uint256 indexed id,
        address indexed raisedBy
    );

    event DisputeResolved(
        uint256 indexed id,
        bool paidToFreelancer,
        uint256 amount
    );

    // Accept ETH only through agreement deposits so every escrowed payment
    // is tied to an agreement and can follow the release/refund rules.
    constructor(){
        admin = msg.sender;
    }

    // 1. สร้างข้อตกลง
    function createAgreement(
        address _freelancer,
        string calldata _projectName,
        string calldata _description,
        uint256 _amount,
        uint256 _deadline
    ) external returns (uint256) {

        require(
            _freelancer != address(0),
            "Invalid freelancer address"
        );

        require(
            _freelancer != msg.sender,
            "Cannot hire yourself"
        );

        require(
            bytes(_projectName).length > 0,
            "Project name required"
        );

        require(
            _amount > 0,
            "Amount must be greater than zero"
        );

        require(
            _deadline > block.timestamp,
            "Deadline must be in the future"
        );

        uint256 id = nextAgreementId++;

        agreements[id] = Agreement({
            id: id,
            employer: msg.sender,
            freelancer: _freelancer,
            projectName: _projectName,
            description: _description,
            amount: _amount,
            deadline: _deadline,
            workProof: "",
            status: Status.Created,
            createdAt: block.timestamp
        });

        emit AgreementCreated(
            id,
            msg.sender,
            _freelancer,
            _amount
        );

        return id;
    }

    // 2. ฝากเงินเข้าระบบ Escrow
    function deposit(
        uint256 _id
    )
        external
        payable
        agreementExists(_id)
    {
        Agreement storage a = agreements[_id];

        require(
            msg.sender == a.employer,
            "Only employer can deposit"
        );

        require(
            a.status == Status.Created,
            "Invalid agreement status"
        );

        require(
            msg.value == a.amount,
            "Incorrect ETH amount"
        );

        a.status = Status.Funded;

        emit PaymentDeposited(_id, msg.value);
    }

    // 3. ฟรีแลนซ์ส่งงาน
    function submitWork(
        uint256 _id,
        string calldata _workProof
    )
        external
        agreementExists(_id)
    {
        Agreement storage a = agreements[_id];

        require(
            msg.sender == a.freelancer,
            "Only freelancer can submit"
        );

        require(
            a.status == Status.Funded,
            "Agreement is not funded"
        );

        require(
            bytes(_workProof).length > 0,
            "Work proof required"
        );

        a.workProof = _workProof;
        a.status = Status.Submitted;

        emit WorkSubmitted(_id, _workProof);
    }

    // 4. ผู้ว่าจ้างอนุมัติและจ่ายเงิน
    function approveAndRelease(
        uint256 _id
    )
        external
        nonReentrant
        agreementExists(_id)
    {
        Agreement storage a = agreements[_id];

        require(
            msg.sender == a.employer,
            "Only employer can approve"
        );

        require(
            a.status == Status.Submitted,
            "Work not submitted"
        );

        uint256 payment = a.amount;
        address payable recipient =
            payable(a.freelancer);

        // เปลี่ยนสถานะก่อนโอนเงิน
        a.status = Status.Completed;

        (bool success, ) = recipient.call{
            value: payment
        }("");

        require(success, "ETH transfer failed");

        emit PaymentReleased(
            _id,
            recipient,
            payment
        );
    }

    // 5. แจ้งข้อพิพาท
    function raiseDispute(
        uint256 _id
    )
        external
        agreementExists(_id)
    {
        Agreement storage a = agreements[_id];

        require(
            msg.sender == a.employer ||
            msg.sender == a.freelancer,
            "Not a party to agreement"
        );

        require(
            a.status == Status.Funded ||
            a.status == Status.Submitted,
            "Cannot dispute this agreement"
        );

        a.status = Status.Disputed;

        emit DisputeRaised(_id, msg.sender);
    }

    // 6. Admin ตัดสินข้อพิพาท
    // true = จ่ายให้ Freelancer
    // false = คืนเงิน Employer
    function resolveDispute(
        uint256 _id,
        bool _payFreelancer
    )
        external
        onlyAdmin
        nonReentrant
        agreementExists(_id)
    {
        Agreement storage a = agreements[_id];

        require(
            a.status == Status.Disputed,
            "Agreement is not disputed"
        );

        uint256 payment = a.amount;

        address payable recipient;

        if (_payFreelancer) {
            recipient = payable(a.freelancer);
            a.status = Status.Completed;
        } else {
            recipient = payable(a.employer);
            a.status = Status.Refunded;
        }

        (bool success, ) = recipient.call{
            value: payment
        }("");

        require(success, "ETH transfer failed");

        emit DisputeResolved(
            _id,
            _payFreelancer,
            payment
        );
    }

    // อ่านข้อมูลข้อตกลง
    function getAgreement(
        uint256 _id
    )
        external
        view
        agreementExists(_id)
        returns (Agreement memory)
    {
        return agreements[_id];
    }

    // ตรวจสอบจำนวนข้อตกลง
    function getAgreementCount()
        external
        view
        returns (uint256)
    {
        return nextAgreementId - 1;
    }

    // ตรวจสอบ ETH ที่อยู่ใน Escrow
    function getEscrowBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    // ไม่อนุญาตให้ส่ง ETH โดยไม่มีข้อตกลง
    receive() external payable {
        revert("Use deposit function");
    }

    fallback() external payable {
        revert("Invalid function");
    }
}
