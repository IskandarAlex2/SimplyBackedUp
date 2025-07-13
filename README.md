# 🗂️ SimplyBackedUp by IskandarAlex2

**SimplyBackedUp** is a lightweight, no-nonsense backup tool I crafted to help me keep my VPS files safe and tidy — ranging from GitHub-synced code, mounted volumes, to essential config files.

It’s designed to be *simple enough to run without a manual*, but here’s the gist:

---

## 🛠️ How It Works

- **Backup Context**:  
  The *current working directory* is taken as the backup scope.

- **Exclusion Rules**:  
  Works just like `.gitignore`, but instead uses a file called `.backupignore`.  
  **Syntax?** Identical to Git’s — if you’ve ignored files before, you’re good to go.

- **Output**:  
  Your backup will be compressed into a file named:  
  `backup-<ISO_TIMESTAMP>.tar.gz`  
  For example: `backup-2025-07-13T14:21:00.tar.gz`

- **Verbose Mode**:  
  Pass the `-v` flag to enable verbose output from the `tar` command, if you’re feeling curious.

- **Debugging**:  
  An exclusion list is generated at `/tmp/backup-exclude-<PID>.list`.  
  ⚠️ *This won’t be auto-deleted* — it’s yours to inspect or clean up manually.

---

## 📜 License

MIT Licensed.  
So feel free to fork it, remix it, or even turn it into a sassy cat-themed cloud sync utility.  
**My backup is your backup.** 🐾

---

## 💬 Final Note

It’s not flashy — it’s *reliable*. Like a fox watching over a den of code.  
If it saves you a few minutes (or a panic attack), then it’s done its job. :3
