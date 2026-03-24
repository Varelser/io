const { Notice, Plugin, PluginSettingTab, Setting, TFolder } = require("obsidian");
const { importLatestSnapshot } = require("./importer");
const { exportExchange } = require("./exchange");

const DEFAULT_SETTINGS = {
  captureFolder: "Thought Workbench/Capture",
  snapshotSourceFolder: "Thought Workbench/Import",
  importTargetFolder: "Thought Workbench/Imported",
  exchangeOutputFolder: "Thought Workbench/Exchange",
  templateTags: "thought-workbench, capture",
  defaultTitlePrefix: "TW Capture",
  lastImportedSnapshot: "",
  lastImportedAt: "",
  lastExchangePath: "",
  lastExchangeAt: "",
};

module.exports = class ThoughtWorkbenchBridgePlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "thought-workbench-create-capture-note",
      name: "Create Thought Workbench capture note",
      callback: async () => {
        await this.createCaptureNote();
      },
    });

    this.addCommand({
      id: "thought-workbench-open-integration-guide",
      name: "Create Thought Workbench integration guide note",
      callback: async () => {
        await this.createGuideNote();
      },
    });

    this.addCommand({
      id: "thought-workbench-import-latest-json-snapshot",
      name: "Import latest Thought Workbench JSON snapshot",
      callback: async () => {
        await importLatestSnapshot(this);
      },
    });

    this.addCommand({
      id: "thought-workbench-export-vault-exchange",
      name: "Export Thought Workbench exchange from imported notes",
      callback: async () => {
        await exportExchange(this);
      },
    });

    this.addSettingTab(new ThoughtWorkbenchSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async ensureFolder(folderPath) {
    if (!folderPath || folderPath === "/") return;
    const parts = folderPath.split("/").filter(Boolean);
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);
      if (!existing) {
        await this.app.vault.createFolder(currentPath);
      } else if (!(existing instanceof TFolder)) {
        throw new Error(`${currentPath} exists and is not a folder`);
      }
    }
  }

  buildCaptureTemplate() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const tags = this.settings.templateTags
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const frontmatter = [
      "---",
      `created: ${now.toISOString()}`,
      `source: obsidian-plugin`,
      "kind: capture",
      "status: inbox",
      "tags:",
      ...tags.map((tag) => `  - ${tag}`),
      "---",
      "",
    ].join("\n");
    return {
      filename: `${this.settings.defaultTitlePrefix} ${stamp}.md`,
      content: `${frontmatter}# ${this.settings.defaultTitlePrefix} ${date}\n\n## Prompt\n\n- What happened?\n- Why does it matter?\n- Which sphere or topic should receive this later?\n\n## Links\n\n- Related topic:\n- Related node:\n`,
    };
  }

  async createCaptureNote() {
    try {
      await this.ensureFolder(this.settings.captureFolder);
      const { filename, content } = this.buildCaptureTemplate();
      const path = `${this.settings.captureFolder}/${filename}`;
      const file = await this.app.vault.create(path, content);
      await this.app.workspace.getLeaf(true).openFile(file);
      new Notice("Thought Workbench capture note created");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "Failed to create capture note");
    }
  }

  async createGuideNote() {
    const folder = "Thought Workbench";
    const guidePath = `${folder}/Integration Guide.md`;
    const content = `# Thought Workbench Integration Guide

## Current scope

- Capture quick notes inside Obsidian
- Keep a dedicated folder for later transfer into Thought Workbench
- Prepare a future bridge for JSON import / vault sync

## Recommended flow

1. Use "Create Thought Workbench capture note" for raw intake.
2. Drop a Thought Workbench JSON snapshot into the configured import folder.
3. Run "Import latest Thought Workbench JSON snapshot" to materialize topic and node notes.
4. Edit imported notes inside the vault.
5. Run "Export Thought Workbench exchange from imported notes" to create an exchange JSON.
6. Use Thought Workbench's Obsidian ZIP export when sending structured data back.

## Planned next step

- Add conflict rules for repeated round-trips
- Let Thought Workbench apply exchange JSON directly
`;

    try {
      await this.ensureFolder(folder);
      const existing = this.app.vault.getAbstractFileByPath(guidePath);
      if (existing) {
        new Notice("Thought Workbench integration guide already exists");
        return;
      }
      const file = await this.app.vault.create(guidePath, content);
      await this.app.workspace.getLeaf(true).openFile(file);
      new Notice("Thought Workbench integration guide created");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "Failed to create integration guide");
    }
  }
};

class ThoughtWorkbenchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Thought Workbench Bridge" });
    containerEl.createEl("p", {
      text: "Configure the vault folder and note template used by the bridge scaffold.",
    });

    new Setting(containerEl)
      .setName("Capture folder")
      .setDesc("Folder where capture notes are created.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.captureFolder)
          .setValue(this.plugin.settings.captureFolder)
          .onChange(async (value) => {
            this.plugin.settings.captureFolder = value.trim() || DEFAULT_SETTINGS.captureFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Snapshot source folder")
      .setDesc("Folder where Thought Workbench JSON snapshots are placed before import.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.snapshotSourceFolder)
          .setValue(this.plugin.settings.snapshotSourceFolder)
          .onChange(async (value) => {
            this.plugin.settings.snapshotSourceFolder = value.trim() || DEFAULT_SETTINGS.snapshotSourceFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Import target folder")
      .setDesc("Folder where imported topic and node notes are written.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.importTargetFolder)
          .setValue(this.plugin.settings.importTargetFolder)
          .onChange(async (value) => {
            this.plugin.settings.importTargetFolder = value.trim() || DEFAULT_SETTINGS.importTargetFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exchange output folder")
      .setDesc("Folder where vault-side updates are written as exchange JSON.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.exchangeOutputFolder)
          .setValue(this.plugin.settings.exchangeOutputFolder)
          .onChange(async (value) => {
            this.plugin.settings.exchangeOutputFolder = value.trim() || DEFAULT_SETTINGS.exchangeOutputFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default title prefix")
      .setDesc("Prefix used for generated capture notes.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.defaultTitlePrefix)
          .setValue(this.plugin.settings.defaultTitlePrefix)
          .onChange(async (value) => {
            this.plugin.settings.defaultTitlePrefix = value.trim() || DEFAULT_SETTINGS.defaultTitlePrefix;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Template tags")
      .setDesc("Comma-separated tags applied to generated capture notes.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.templateTags)
          .setValue(this.plugin.settings.templateTags)
          .onChange(async (value) => {
            this.plugin.settings.templateTags = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Last imported snapshot")
      .setDesc(
        this.plugin.settings.lastImportedAt
          ? `Last imported at ${this.plugin.settings.lastImportedAt}`
          : "No snapshot imported yet."
      )
      .addText((text) =>
        text
          .setDisabled(true)
          .setValue(this.plugin.settings.lastImportedSnapshot || "-")
      );

    new Setting(containerEl)
      .setName("Last exchange output")
      .setDesc(
        this.plugin.settings.lastExchangeAt
          ? `Last exported at ${this.plugin.settings.lastExchangeAt}`
          : "No exchange exported yet."
      )
      .addText((text) =>
        text
          .setDisabled(true)
          .setValue(this.plugin.settings.lastExchangePath || "-")
      );
  }
}
