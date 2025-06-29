# MEMO_TO_GEMINI.md

## Current Status:
- The project "Zoaholic" has a basic host-client architecture with a modern Tailwind CSS UI.
- Clients report system information (CPU, RAM, Disk, Net) and Docker container status.
- Update mode simulates fetching files from a GitHub repository.
- Rescue mode is a basic simulation.
- A basic plugin system is in place for both host and client.
- All changes are committed and pushed to the `main` branch on GitHub.
- A `TODO.md` file exists with a detailed list of future tasks and their priorities.
- The `README.md` has been updated to reflect the current specifications.

## Next Steps (Based on TODO.md):

The user has indicated they are going to sleep. When they return, the most logical next step, based on the `TODO.md` and the "High" priority items, would be to address the **WebUI usability improvements for client selection and update file specification.**

Specifically, focus on:

### 1.1. アップデート対象クライアントの選択 (High Priority)
- Implement a mechanism in the WebUI to select clients from a list instead of manual hostname input. This will involve:
    - Modifying `public/script.js` to dynamically generate a dropdown or similar selection UI based on the `serverStatus` data received from the host.
    - Updating the "Update Client" button's logic to use the selected client's hostname.

### 1.2. アップデートファイルの指定方法の改善 (High Priority)
- Implement UI elements in the WebUI to allow users to input `repoUrl` and `filesToUpdate` dynamically, rather than having them hardcoded in `public/script.js`. This will involve:
    - Modifying `public/index.html` to add input fields for `repoUrl` and dynamic fields for `sourcePath` and `targetPath` pairs.
    - Modifying `public/script.js` to read these input values and include them in the `fetch` request body for the update command.

---

**Important Considerations:**
- Continue to make small, focused commits with clear, Japanese-tagged messages.
- Ensure thorough testing after each significant change.
- Be mindful of the user's preference for a "cool, modern UI" and maintain the Tailwind CSS aesthetic.
