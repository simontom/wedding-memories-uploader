# Wedding Memories Uploader

A mobile-friendly, frictionless web application for guests to upload photos and videos directly into a shared Google Drive wedding folder without requiring any Google account sign-in.

- **Google Drive Target Folder:** [Wedding Photos Album](https://drive.google.com/drive/folders/YOUR-GOOGLE-DRIVE-FOLDER-ID) (`YOUR-GOOGLE-DRIVE-FOLDER-ID`)
- **GitHub Repository:** [simontom/wedding-memories-uploader](https://github.com/simontom/wedding-memories-uploader)

---

## ✨ Features

- **No Google Account Login Required:** Anyone with the link or QR code can upload from their mobile browser (Safari, Chrome, etc.).
- **Direct & Flat Storage:** All uploaded photos go directly into your main Google Drive folder without subfolder clutter.
- **Unique Chronological File Names:** Automatically generates names formatted as:
  `wedding_YYYYMMDD_HHMMSS_[hash]_[originalName].[ext]`
  *(e.g., `wedding_20260928_105530_a1b2c3_IMG_0042.jpg`)*.
  Prevents duplicate name collisions and orders photos chronologically by upload time in Drive.
- **Multi-File Selection:** Guests can pick multiple photos/videos from their camera roll simultaneously.
- **Upload Progress:** Real-time progress bar showing the upload percentage and current file.
- **Apple HEIC & Video Support:** Accepts `.jpg`, `.png`, `.heic`, `.heif`, and standard mobile video formats.
- **Multi-Language Support (Per-Device):** Supports **Czech (default)**, **English**, **Spanish**, and **Romanian**. Remembers the guest's choice in browser `localStorage` and automatically detects phone language on first visit.

---

## 🚀 Setup & Deployment Guide

### Step 1: Open Google Apps Script

1. Go to [script.google.com](https://script.google.com/).
2. Click **New project** (top-left).
3. Name the project **Wedding Memories Uploader**.

### Step 2: Add Backend (`Code.gs`)

1. Open `Code.gs` in the editor.
2. Replace all existing text with the contents of [`Code.gs`](./Code.gs).
3. Save (`Ctrl + S` or `Cmd + S`).

### Step 3: Add Frontend (`Index.html`)

1. Click the **`+`** icon next to **Files** > Select **HTML**.
2. Name the file **`Index`** (Apps Script will create `Index.html`).
3. Replace the entire contents with [`Index.html`](./Index.html).
4. Save (`Ctrl + S` or `Cmd + S`).

### Step 4: Deploy as Web App

1. Click the blue **Deploy** button (top-right) > **New deployment**.
2. Click the **Gear icon (Select type)** > choose **Web app**.
3. Configure the deployment:
   - **Description**: `Wedding Memories Web App`
   - **Execute as**: **`Me (your Google account)`**
   - **Who has access**: **`Anyone`** *(CRITICAL: This allows guests to upload without logging into Google!)*
4. Click **Deploy**.

### Step 5: Authorize Drive Permissions

1. Click **Authorize access** and choose your Google account.
2. When the *"Google hasn't verified this app"* screen appears:
   - Click **Advanced** (bottom-left).
   - Click **Go to Wedding Memories Uploader (unsafe)**.
   - Click **Allow**.

### Step 6: Generate QR Code for Guests

1. Copy the **Web app URL** (ends in `/exec`).
2. Generate a QR code using any free generator (or right-click the open web app in Google Chrome and choose *“Create QR code for this page”*).
3. Print the QR code for table stands or welcome cards at the wedding venue!

---

## 🔄 Making Future Updates

### Option A: Automated CLI Deployment (Recommended)

You can push code and update your deployment directly from the terminal without opening the Google Apps Script browser editor:

1. **One-Time Setup:**
   * Enable the Google Apps Script API at [script.google.com/home/usersettings](https://script.google.com/home/usersettings).
   * Log in to Google via terminal:
     ```bash
     npx clasp login
     ```
   * Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   * Fill in your `SCRIPT_ID`, `TARGET_FOLDER_ID`, and optional `DEPLOYMENT_ID` in `.env`.

2. **Deploy with One Command:**
   ```bash
   npm run deploy
   ```
   *This automatically replaces the `TARGET_FOLDER_ID` in a staging build (keeping your tracked source file clean), uploads the code, and updates your live deployment!*

3. **Deploy with Custom Message / Overrides:**
   ```bash
   npm run deploy -- -m "Added multi-language support"
   ```

4. **Upload Code Only (Skip Deployment):**
   ```bash
   npm run push
   ```

---

### Option B: Manual Updates via Web Browser

If you prefer using the Apps Script browser editor:

1. Open your project on [script.google.com](https://script.google.com/).
2. Copy and paste your updated `Code.gs` and `Index.html`.
3. Click **Deploy** > **Manage deployments**.
4. Click the **Pencil (Edit)** icon on your deployment.
5. Change **Version** to **New version**.
6. Click **Deploy** (your live link and QR code will remain the same).

