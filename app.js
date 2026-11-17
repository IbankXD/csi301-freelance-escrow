
const CONTRACT_ADDRESS = "0x73DB3A8CFe4C5011D485c8Fb9bc0E0fB66127966";

const SEPOLIA_CHAIN_ID = "0xaa36a7";
const TRANSACTION_HISTORY_KEY =
    `digitalwork:transactions:${CONTRACT_ADDRESS.toLowerCase()}`;

const CONTRACT_ABI = [
    "function admin() view returns (address)",
    "function getAgreementCount() view returns (uint256)",
    "function getEscrowBalance() view returns (uint256)",
    "function getAgreement(uint256) view returns (tuple(uint256 id,address employer,address freelancer,string projectName,string description,uint256 amount,uint256 deadline,string workProof,uint8 status,uint256 createdAt))",

    "function createAgreement(address,string,string,uint256,uint256) returns (uint256)",
    "function deposit(uint256) payable",
    "function submitWork(uint256,string)",
    "function approveAndRelease(uint256)",
    "function raiseDispute(uint256)",
    "function resolveDispute(uint256,bool)"
];

const STATUS = [
    "Created",
    "Funded",
    "Submitted",
    "Disputed",
    "Completed",
    "Refunded"
];

let provider;
let signer;
let contract;
let account;
let adminAddress;
let transactionPending = false;

let agreements = [];

// -----------------------------
// NOTIFICATION
// -----------------------------

function notify(message, type = "success") {
    const box = document.getElementById("notification");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    box.replaceChildren(toast);

    setTimeout(() => {
        if (box.firstChild === toast) {
            box.replaceChildren();
        }
    }, 5000);
}

// -----------------------------
// NAVIGATION
// -----------------------------

function showPage(page) {
    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.remove("active");
    });

    document.getElementById(page).classList.add("active");

    document.querySelector(`[data-page="${page}"]`)
        ?.classList.add("active");

    const titles = {
        dashboard: "Dashboard",
        projects: "Agreements",
        create: "Create Agreement",
        admin: "Admin Panel"
    };

    document.getElementById("pageTitle").textContent =
        titles[page] || page;
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

// -----------------------------
// CONNECT WALLET
// -----------------------------

async function connectWallet() {

    if (!window.ethereum) {
        return notify("Please install MetaMask", "error");
    }

    try {

        provider = new ethers.BrowserProvider(window.ethereum);

        await provider.send("eth_requestAccounts", []);

        signer = await provider.getSigner();

        const network = await provider.getNetwork();

        if (Number(network.chainId) !== 11155111) {

            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: SEPOLIA_CHAIN_ID }]
            });

            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
        }

        account = await signer.getAddress();

        contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
        );

        adminAddress = await contract.admin();

        document.getElementById("walletAddress").textContent =
            account.slice(0, 6) + "..." + account.slice(-4);

        document.getElementById("connectWallet").textContent =
            "Connected";

        notify("Wallet connected successfully");

        await loadDashboard();

    } catch (error) {
        console.error(error);
        notify(error.shortMessage || error.message, "error");
    }
}

document.getElementById("connectWallet")
    .addEventListener("click", connectWallet);

// -----------------------------
// LOAD DASHBOARD
// -----------------------------

async function loadDashboard() {

    if (!contract) return;

    try {

        const count = await contract.getAgreementCount();

        const balance = await contract.getEscrowBalance();

        document.getElementById("totalAgreements").textContent =
            count.toString();

        document.getElementById("escrowBalance").textContent =
            Number(ethers.formatEther(balance)).toFixed(5) + " ETH";

        agreements = [];

        // Load up to 100 newest agreements
        const total = Number(count);
        const start = Math.max(1, total - 99);

        for (let id = total; id >= start; id--) {

            const a = await contract.getAgreement(id);

            agreements.push(a);
        }

        const active = agreements.filter(a =>
            [1, 2, 3].includes(Number(a.status))
        );

        const completed = agreements.filter(a =>
            Number(a.status) === 4
        );

        document.getElementById("activeProjects").textContent =
            active.length;

        document.getElementById("completedProjects").textContent =
            completed.length;

        renderAgreements();

    } catch (error) {
        console.error(error);
        notify("Failed to load contract data", "error");
    }
}

// -----------------------------
// RENDER AGREEMENTS
// -----------------------------

function renderAgreements() {

    const table = document.getElementById("agreementTable");
    const recent = document.getElementById("recentTable");
    const adminTable = document.getElementById("adminTable");

    table.innerHTML = "";
    recent.innerHTML = "";
    adminTable.innerHTML = "";

    if (agreements.length === 0) {
        table.innerHTML =
            `<tr><td colspan="7">No agreements found</td></tr>`;

        recent.innerHTML =
            `<tr><td colspan="6">No agreements found</td></tr>`;

        adminTable.innerHTML =
            `<tr><td colspan="5">No disputes found</td></tr>`;

        return;
    }

    agreements.forEach(a => {

        const id = Number(a.id);
        const status = Number(a.status);
        const statusName = STATUS[status];

        const amount = ethers.formatEther(a.amount);

        const deadline = new Date(
            Number(a.deadline) * 1000
        ).toLocaleDateString();

        const row = `
            <tr>
                <td>#${id}</td>
                <td>${escapeHTML(a.projectName)}</td>
                <td>${a.employer.slice(0, 6)}...</td>
                <td>${a.freelancer.slice(0, 6)}...</td>
                <td>${amount} ETH</td>
                <td>
                    <span class="status ${statusName}">
                        ${statusName}
                    </span>
                </td>
                <td>
                    <button class="action-link"
                        onclick="openAgreement(${id})">
                        Details
                    </button>
                </td>
            </tr>
        `;

        table.innerHTML += row;

        if (status === 3) {
            adminTable.innerHTML += `
                <tr>
                    <td>#${id}</td>
                    <td>${escapeHTML(a.projectName)}</td>
                    <td>${amount} ETH</td>
                    <td><span class="status Disputed">Disputed</span></td>
                    <td>
                        <button class="action-link"
                            onclick="openAgreement(${id})">
                            Resolve
                        </button>
                    </td>
                </tr>
            `;
        }

    });

    agreements.slice(0, 5).forEach(a => {
        const id = Number(a.id);
        const statusName = STATUS[Number(a.status)];
        const amount = ethers.formatEther(a.amount);
        const deadline = new Date(
            Number(a.deadline) * 1000
        ).toLocaleDateString();

        recent.innerHTML += `
            <tr>
                <td>#${id}</td>
                <td>${escapeHTML(a.projectName)}</td>
                <td>${amount} ETH</td>
                <td>${deadline}</td>
                <td><span class="status ${statusName}">${statusName}</span></td>
                <td>
                    <button class="action-link" onclick="openAgreement(${id})">
                        View
                    </button>
                </td>
            </tr>
        `;
    });

    if (!adminTable.innerHTML) {
        adminTable.innerHTML =
            `<tr><td colspan="5">No disputes found</td></tr>`;
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getTransactionHistory() {
    const stored = localStorage.getItem(TRANSACTION_HISTORY_KEY);

    if (!stored) {
        return [];
    }

    const history = JSON.parse(stored);

    if (!Array.isArray(history)) {
        throw new Error("Saved transaction history has an invalid format");
    }

    return history;
}

function saveTransactionRecord(record) {
    try {
        const history = getTransactionHistory();
        const existingIndex = history.findIndex(
            item => item.hash === record.hash
        );

        if (existingIndex === -1) {
            history.unshift(record);
        } else {
            history[existingIndex] = {
                ...history[existingIndex],
                ...record
            };
        }

        localStorage.setItem(
            TRANSACTION_HISTORY_KEY,
            JSON.stringify(history.slice(0, 100))
        );
    } catch (error) {
        console.error(error);
        notify("Transaction history could not be saved in this browser.", "error");
    }
}

function updateTransactionRecord(hash, updates) {
    try {
        const history = getTransactionHistory();
        const record = history.find(item => item.hash === hash);

        if (!record) {
            throw new Error(`Transaction ${hash} is missing from local history`);
        }

        Object.assign(record, updates);
        localStorage.setItem(TRANSACTION_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error(error);
        notify("Transaction history could not be updated.", "error");
    }
}

function renderTransactionHistory(agreementId) {
    const container = document.getElementById("transactionHistory");

    try {
        const history = getTransactionHistory()
            .filter(item => String(item.agreementId) === String(agreementId))
            .sort((a, b) => b.timestamp - a.timestamp);

        if (history.length === 0) {
            container.innerHTML = "<p>No transactions recorded in this browser.</p>";
            return;
        }

        container.innerHTML = history.map(item => {
            const hash = String(item.hash);
            const validHash = /^0x[a-fA-F0-9]{64}$/.test(hash);
            const hashDisplay = validHash
                ? `<a href="https://sepolia.etherscan.io/tx/${hash}" target="_blank" rel="noopener noreferrer">${escapeHTML(hash)}</a>`
                : escapeHTML(hash);

            return `
                <div class="transaction-row">
                    <strong>${escapeHTML(item.action)}</strong>
                    <span class="transaction-status ${escapeHTML(item.status)}">${escapeHTML(item.status)}</span>
                    <small>${new Date(item.timestamp).toLocaleString()}</small>
                    <small>Wallet: ${escapeHTML(item.account)}</small>
                    <small>Tx: ${hashDisplay}</small>
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error(error);
        container.textContent = "Transaction history is unavailable.";
        notify("Could not read transaction history from this browser.", "error");
    }
}

// -----------------------------
// CREATE AGREEMENT
// -----------------------------

document.getElementById("createForm")
    .addEventListener("submit", async (e) => {

    e.preventDefault();

    if (!contract) {
        return notify("Connect wallet first", "error");
    }

    if (transactionPending) {
        return notify("Please wait for the current transaction to finish.", "error");
    }

    let creationTx;
    try {

        const freelancer =
            document.getElementById("freelancer").value.trim();

        const projectName =
            document.getElementById("projectName").value.trim();

        const description =
            document.getElementById("description").value;

        const amount = ethers.parseEther(
            document.getElementById("amount").value
        );

        const deadline = Math.floor(
            new Date(
                document.getElementById("deadline").value
            ).getTime() / 1000
        );

        if (!ethers.isAddress(freelancer)) {
            throw new Error("Invalid freelancer address");
        }

        if (freelancer.toLowerCase() === account.toLowerCase()) {
            throw new Error("Cannot hire yourself");
        }

        if (!projectName.trim()) {
            throw new Error("Project name is required");
        }

        if (amount <= 0n) {
            throw new Error("Amount must be greater than zero");
        }

        if (deadline <= Math.floor(Date.now() / 1000)) {
            throw new Error("Deadline must be in the future");
        }

        setTransactionPending(true);
        const tx = await contract.createAgreement(
            freelancer,
            projectName,
            description,
            amount,
            deadline
        );
        creationTx = tx;

        notify("Transaction submitted. Waiting for confirmation.");

        saveTransactionRecord({
            agreementId: "",
            action: "Create Agreement",
            hash: tx.hash,
            status: "pending",
            timestamp: Date.now(),
            account
        });

        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            throw new Error("Agreement creation transaction reverted");
        }

        updateTransactionRecord(tx.hash, { status: "confirmed" });

        try {
            const agreementId = await contract.getAgreementCount();
            updateTransactionRecord(tx.hash, {
                agreementId: agreementId.toString()
            });
        } catch (error) {
            console.error(error);
            notify("Agreement was created, but its transaction history could not be linked.", "error");
        }

        notify("Agreement created successfully!");

        e.target.reset();

        await loadDashboard();

        showPage("projects");

    } catch (error) {
        console.error(error);
        if (creationTx) {
            updateTransactionRecord(creationTx.hash, { status: "failed" });
        }
        notify(error.shortMessage || error.reason || error.message, "error");
    } finally {
        setTransactionPending(false);
    }
});

// -----------------------------
// AGREEMENT DETAILS
// -----------------------------

async function openAgreement(id) {

    try {

        const a = await contract.getAgreement(id);

        const status = STATUS[Number(a.status)];

        document.getElementById("detailTitle").textContent =
            `Agreement #${id}`;

        document.getElementById("detailContent").innerHTML = `

            <div class="detail-row">
                Project:
                <strong>${escapeHTML(a.projectName)}</strong>
            </div>

            <div class="detail-row">
                Description:
                <strong>${escapeHTML(a.description)}</strong>
            </div>

            <div class="detail-row">
                Employer:
                <strong>${a.employer}</strong>
            </div>

            <div class="detail-row">
                Freelancer:
                <strong>${a.freelancer}</strong>
            </div>

            <div class="detail-row">
                Amount:
                <strong>${ethers.formatEther(a.amount)} ETH</strong>
            </div>

            <div class="detail-row">
                Deadline:
                <strong>${new Date(Number(a.deadline) * 1000).toLocaleString()}</strong>
            </div>

            <div class="detail-row">
                Status:
                <strong>${status}</strong>
            </div>

            <div class="detail-row">
                Work Proof:
                <strong>${escapeHTML(a.workProof || "Not submitted")}</strong>
            </div>

        `;

        renderTransactionHistory(id);
        renderActions(a);

        document.getElementById("detailModal")
            .classList.add("show");

    } catch (error) {
        console.error(error);
        notify("Unable to load agreement", "error");
    }
}

// -----------------------------
// ACTION BUTTONS
// -----------------------------

function renderActions(a) {

    const actions = document.getElementById("detailActions");

    actions.innerHTML = "";

    const id = Number(a.id);
    const status = Number(a.status);

    const isEmployer =
        a.employer.toLowerCase() === account.toLowerCase();

    const isFreelancer =
        a.freelancer.toLowerCase() === account.toLowerCase();

    const isAdmin =
        adminAddress.toLowerCase() === account.toLowerCase();

    if (status === 0 && isEmployer) {

        addAction(
            "Deposit ETH",
            () => deposit(id, a.amount)
        );
    }

    if (status === 1 && isFreelancer) {

        addAction(
            "Submit Work",
            () => submitWork(id)
        );
    }

    if (status === 2 && isEmployer) {

        addAction(
            "Approve & Release Payment",
            () => approvePayment(id)
        );
    }

    if ([1, 2].includes(status) && (isEmployer || isFreelancer)) {

        addAction(
            "Raise Dispute",
            () => raiseDispute(id),
            true
        );
    }

    if (status === 3 && isAdmin) {

        addAction(
            "Pay Freelancer",
            () => resolveDispute(id, true)
        );

        addAction(
            "Refund Employer",
            () => resolveDispute(id, false),
            true
        );
    }
}

function addAction(label, callback, secondary = false) {

    const button = document.createElement("button");

    button.textContent = label;

    button.className = secondary
        ? "secondary-btn"
        : "primary-btn";
    button.disabled = transactionPending;

    button.onclick = callback;

    document.getElementById("detailActions")
        .appendChild(button);
}

// -----------------------------
// DEPOSIT
// -----------------------------

async function deposit(id, amount) {

    if (!confirm("Deposit the exact ETH amount into escrow?")) return;

    await executeTransaction(id, "Deposit Payment", async () => {

        const tx = await contract.deposit(id, {
            value: amount
        });

        return tx;

    });
}

// -----------------------------
// SUBMIT WORK
// -----------------------------

async function submitWork(id) {

    const proof = prompt(
        "Enter work proof URL or description:"
    );

    if (!proof || !proof.trim()) return;

    await executeTransaction(id, "Submit Work", async () => {

        return await contract.submitWork(id, proof.trim());

    });
}

// -----------------------------
// APPROVE PAYMENT
// -----------------------------

async function approvePayment(id) {

    if (!confirm("Release payment to freelancer? This cannot be undone.")) return;

    await executeTransaction(id, "Approve and Release Payment", async () => {

        return await contract.approveAndRelease(id);

    });
}

// -----------------------------
// RAISE DISPUTE
// -----------------------------

async function raiseDispute(id) {

    if (!confirm("Are you sure you want to raise a dispute?")) return;

    await executeTransaction(id, "Raise Dispute", async () => {

        return await contract.raiseDispute(id);

    });
}

// -----------------------------
// RESOLVE DISPUTE
// -----------------------------

async function resolveDispute(id, payFreelancer) {

    const message = payFreelancer
        ? "Pay freelancer?"
        : "Refund employer?";

    if (!confirm(message)) return;

    const action = payFreelancer
        ? "Resolve Dispute: Pay Freelancer"
        : "Resolve Dispute: Refund Employer";

    await executeTransaction(id, action, async () => {

        return await contract.resolveDispute(
            id,
            payFreelancer
        );

    });
}

// -----------------------------
// TRANSACTION HANDLER
// -----------------------------

function setTransactionPending(pending) {
    transactionPending = pending;
    document.querySelectorAll("#createForm button, #detailActions button")
        .forEach(button => {
            button.disabled = pending;
        });
}

async function executeTransaction(agreementId, actionName, action) {

    if (transactionPending) {
        return notify("Please wait for the current transaction to finish.", "error");
    }

    setTransactionPending(true);
    let tx;
    try {

        tx = await action();

        saveTransactionRecord({
            agreementId: String(agreementId),
            action: actionName,
            hash: tx.hash,
            status: "pending",
            timestamp: Date.now(),
            account
        });

        renderTransactionHistory(agreementId);

        notify("Transaction submitted. Waiting for confirmation.");

        const receipt = await tx.wait();
        if (receipt.status !== 1) {
            throw new Error("Transaction reverted");
        }
        updateTransactionRecord(tx.hash, {
            status: "confirmed"
        });

        notify("Transaction successful!");

        await loadDashboard();
        await openAgreement(agreementId);

    } catch (error) {

        console.error(error);

        if (tx) {
            updateTransactionRecord(tx.hash, { status: "failed" });
        }

        notify(
            error.reason || error.shortMessage || error.message,
            "error"
        );
    } finally {
        setTransactionPending(false);
    }
}

// -----------------------------
// MODAL
// -----------------------------

function closeModal() {
    document.getElementById("detailModal")
        .classList.remove("show");
}

window.addEventListener("click", (e) => {
    if (e.target.id === "detailModal") {
        closeModal();
    }
});

// -----------------------------
// WALLET EVENTS
// -----------------------------

if (window.ethereum) {

    window.ethereum.on("accountsChanged", () => {
        window.location.reload();
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}

// -----------------------------
// INITIALIZATION
// -----------------------------

window.showPage = showPage;
window.openAgreement = openAgreement;
window.closeModal = closeModal;
