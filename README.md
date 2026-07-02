# ABES Connect

ABES Connect is a professional networking platform (similar to LinkedIn) designed specifically for students, alumni, and faculty of **ABES Engineering College**. This application helps bridge the gap between college education and industry success by facilitating alumni mentorship, job referrals, and student collaboration.

Currently, this repository features a clean, responsive, and professional landing page in both Light and Dark modes.

---

## 🚀 Getting Started

Follow these simple steps to run the application on your local machine:

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18 or above recommended).

### 2. Install Dependencies
In the project root directory, run the following command to install all required packages:
```bash
npm install
```

### 3. Run the Development Server
Start the local server by running:
```bash
npm run dev
```

### 4. View in Browser
Open your browser and navigate to:
```text
http://localhost:3000
```
The page will live-reload if you make changes to `src/app/page.tsx`.

---

## 📦 Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router, Version 15+)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Fonts**: [Geist Sans](https://vercel.com/font)

---

## 📤 Pushing to GitHub

To store this project on your GitHub account, follow these steps:

### 1. Initialize Git Repository
If Git isn't already initialized in this folder, run:
```bash
git init
```

### 2. Stage and Commit Your Files
Add your files to the staging area and make the initial commit:
```bash
git add .
git commit -m "feat: initial commit for ABES Connect landing page"
```

### 3. Create a Repository on GitHub
1. Go to [github.com](https://github.com/) and log in.
2. Click the green **New** button to create a repository.
3. Name your repository `abes-connect` (or any name you prefer).
4. Leave it empty (do **not** initialize with a README, `.gitignore`, or License as this project already has them).
5. Click **Create repository**.

### 4. Link Local Repository to GitHub
Copy the commands displayed under the **"…or push an existing repository from the command line"** section on GitHub. They will look similar to this:
```bash
# Rename the default branch to main
git branch -M main

# Add your GitHub repository as the remote origin
# (Replace USERNAME and REPO-NAME with your actual GitHub username and repository name)
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# Push the code to GitHub
git push -u origin main
```
Once run, your landing page code will be successfully pushed to your GitHub repository!
