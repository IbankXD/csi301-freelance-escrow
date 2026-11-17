# DigitalWork - Freelance Escrow
**CSI301 Blockchain & Smart Contract Technologies**

---

### 👥 ข้อมูลกลุ่มผู้พัฒนา (Group Info)
* **ชื่อกลุ่ม:** **DoubleFatZ**
* **สมาชิกในกลุ่ม:**
  1. `66026188` — นายศิวัฒน์ แก้วหนองสังข์
  2. `66084733` — นายธนวัฒน์ ณรงค์วงศ์วัฒนา

---

## 📌 บทสรุปโครงการ (Executive Summary)
ระบบจ้างงานและวางเงินประกันผลงานดิจิทัล (Freelance Escrow) พัฒนาขึ้นบน **Ethereum Blockchain (Sepolia Testnet)** เพื่อแก้ไขปัญหาการเบี้ยวค่าจ้าง การส่งมอบงานไม่ตรงตามข้อตกลง และสร้างกลไกคนกลางที่โปร่งใส ตรวจสอบได้ทุกขั้นตอน

---

## 🔗 ข้อมูลการ Deploy ระบบ (Deployment Info)

* **📜 Smart Contract Address (Sepolia):** `0x73DB3A8CFe4C5011D485c8Fb9bc0E0fB66127966`
* **🔍 Sepolia Etherscan:** `https://sepolia.etherscan.io/address/0x73DB3A8CFe4C5011D485c8Fb9bc0E0fB66127966`
* **⛓️ Blockchain Network:** Ethereum Sepolia Testnet (`Chain ID: 11155111`)
* **👑 Contract Admin:** `0x6c6Ba97164350DCccd114B697aCeaCA6Df6CC75b`

---

## ✨ ความสามารถของระบบ (Key Features)

- **สร้างข้อตกลง (Create Agreement):** ระบุชื่อโครงการ รายละเอียด ผู้รับจ้าง จำนวน ETH และกำหนดส่ง
- **ผู้ว่าจ้างฝากเงิน (Deposit Escrow):** ฝากเงินค่าจ้างเข้า Smart Contract เพื่อการันตีว่ามีเงินจ่ายจริง
- **ผู้รับจ้างส่งงาน (Submit Work):** ส่งหลักฐานผลงานเป็นข้อความหรือ URL เข้าสู่ระบบ
- **ผู้ว่าจ้างอนุมัติงาน (Approve & Release):** เมื่อตรวจสอบงานเรียบร้อย สามารถกดยืนยันเพื่อโอนเงินให้ผู้รับจ้างทันที
- **ระบบข้อพิพาท (Dispute Resolution):** คู่สัญญาแจ้งข้อพิพาทได้ และผู้ดูแลสัญญา (Admin) สามารถตัดสินใจจ่ายเงินให้ผู้รับจ้างหรือคืนให้ผู้ว่าจ้างได้อย่างเป็นธรรม
- **ประวัติธุรกรรม (Transaction History):** หน้าเว็บแสดงสถานะข้อตกลงและลิงก์ Transaction Hash ไปยัง Sepolia Etherscan

---

## 📂 โครงสร้างไฟล์ในโปรเจกต์ (Project Structure)

```text
Project1_DigitalWork_FreelanceEscrow/
├── index.html              # หน้าเว็บหลัก (Dashboard, Agreements, Create, Admin Panel)
├── style.css               # สไตล์และเลย์เอาต์หน้าเว็บ
├── app.js                  # เชื่อมต่อ MetaMask และเรียก Smart Contract ด้วย Ethers.js
├── FreelanceEscrow.sol      # Smart Contract สำหรับเก็บเงินและควบคุมสถานะ (Solidity)
└── README.md               # เอกสารอธิบายโครงงานและคู่มือการใช้งาน
```

---

## 🧪 คู่มือการทดสอบระบบสำหรับอาจารย์ผู้ตรวจ (Testing Guide)

1. **เปิดหน้าเว็บผ่าน Live Server หรือ GitHub Pages**
2. **เชื่อมต่อ MetaMask:** ตรวจสอบว่าเลือกเครือข่ายเป็น **Ethereum Sepolia Testnet**
3. **ตรวจสอบสถิติและข้อตกลงเดิม:** ระบบจะดึงข้อมูลข้อตกลงจริงบน Sepolia มาแสดงผลที่ Dashboard
4. **ทดสอบสร้างข้อตกลง:** ไปที่เมนู `Create Project` กรอกรายละเอียด และกดยืนยัน Transaction บน MetaMask
5. **ทดสอบฝากเงินและส่งมอบงาน:** ดำเนินการตามลำดับขั้นตอน `Created` → `Funded` → `Submitted` → `Completed`

---

## 🛠️ เทคโนโลยีที่ใช้พัฒนา (Tech Stack)

* **Smart Contract:** Solidity (`^0.8.20`)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Web3 Library:** Ethers.js (`v6.13.5`)
* **Network:** Ethereum Sepolia Testnet
