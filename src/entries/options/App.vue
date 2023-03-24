<template>
  <div>
    <h1>ChatGPT Options</h1>
    <form @submit.prevent="saveOptions">
      <table>
        <tr>
          <td><label for="model">Model:</label></td>
          <td><input type="text" id="model" name="model" v-model="model" /></td>
        </tr>
        <tr>
          <td><label for="temperature">Temperature:</label></td>
          <td><input type="text" id="temperature" name="temperature" v-model="temperature" /></td>
        </tr>
        <tr>
          <td><label for="maxTokens">Max Tokens:</label></td>
          <td><input type="text" id="maxTokens" name="maxTokens" v-model="maxTokens" /></td>
        </tr>
        <tr>
          <td><label for="topP">Top P:</label></td>
          <td><input type="text" id="topP" name="topP" v-model="topP" /></td>
        </tr>
        <tr>
          <td><label for="frequencyPenalty">Frequency Penalty:</label></td>
          <td><input type="text" id="frequencyPenalty" name="frequencyPenalty" v-model="frequencyPenalty" /></td>
        </tr>
        <tr>
          <td><label for="presencePenalty">Presence Penalty:</label></td>
          <td><input type="text" id="presencePenalty" name="presencePenalty" v-model="presencePenalty" /></td>
        </tr>
        <tr>
          <td><label for="apiKey">API Key:</label></td>
          <td><input type="password" id="apiKey" name="apiKey" placeholder="set new api-key" v-model="apiKey" /></td>
        </tr>
        <tr>
          <td></td>
          <td>
            <input type="submit" value="Save" />
            <button type="button" id="resetDefaults" @click="resetDefaults">Reset Defaults</button>
            <button type="button" id="exportConfig" @click="exportConfig">Export Config</button>
            <button type="button" id="importConfig" @click="importConfig">Import Config</button>
          </td>
        </tr>
      </table>
      <h2>Prompts</h2>
      <div id="prompts">
        <div v-for="(prompt, index) in prompts" :key="index" class="prompt-group">
          <label :for="'promptName' + index">Prompt Name:</label>
          <input type="text" :id="'promptName' + index" :name="'promptName' + index" v-model="prompt.name" />
          <label :for="'promptContent' + index">Prompt:</label>
          <textarea :id="'promptContent' + index" :name="'promptContent' + index" class="prompt-content"
            v-model="prompt.content"></textarea>
          <button type="button" @click="removePrompt(index)">Remove</button>
        </div>
      </div>
      <div id="prompts-help">
        <p>Use %s to insert the selected text into the prompt.</p>
      </div>
      <button type="button" id="addPrompt" @click="addPrompt">+ Add Prompt</button>
    </form>
  </div>
</template>

<script lang="ts">
import browser from "webextension-polyfill";
import { defineComponent, computed, watch, reactive } from 'vue';

interface Prompt {
  name: string;
  content: string;
}

const defaultConfig = {
  model: 'gpt-3.5-turbo',
  temperature: 0.9,
  maxTokens: 64,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  API_KEY: '',
  prompts: [],
}

export default defineComponent({
  name: 'ChatGPTOptions',

  setup() {
    const data = reactive({
      // Add unsavedChanges property
      unsavedChanges: false,
      // Other data properties
      // ...
    });

    watch(
      () => data,
      () => {
        checkForUnsavedChanges(data);
      },
      { deep: true }
    );

    // Add a method to compare the current data with the saved configuration
    async function checkForUnsavedChanges(data: any) {
      const savedConfig = await browser.storage.sync.get(defaultConfig);
      const currentConfig = {
        model: data.model,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        topP: data.topP,
        frequencyPenalty: data.frequencyPenalty,
        presencePenalty: data.presencePenalty,
        prompts: data.prompts,
      };

      data.unsavedChanges = JSON.stringify(savedConfig) !== JSON.stringify(currentConfig);
    }

    // Add a computed property for the save button label
    const saveButtonLabel = computed(() => (data.unsavedChanges ? 'Save *' : 'Save'));

    return {
      ...data,
      saveButtonLabel,
    };
  },

  data() {
    return {
      model: '',
      temperature: '',
      maxTokens: '',
      topP: '',
      frequencyPenalty: '',
      presencePenalty: '',
      apiKey: '',
      prompts: [] as Prompt[],
    }
  },

  async created() {
    await this.restoreOptions();
  },

  methods: {
    addPrompt() {
      this.prompts.push({ name: '', content: '' });
    },

    removePrompt(index: number) {
      this.prompts.splice(index, 1);
    },

    async restoreOptions() {
      const result = await browser.storage.sync.get(defaultConfig);

      this.model = result.model;
      this.temperature = result.temperature;
      this.maxTokens = result.maxTokens;
      this.topP = result.topP;
      this.frequencyPenalty = result.frequencyPenalty;
      this.presencePenalty = result.presencePenalty;
      this.apiKey = result.API_KEY;

      if (Array.isArray(result.prompts) && result.prompts.length > 0) {
        this.prompts = result.prompts;
      } else {
        const defaultPromptName = 'Spelling and Grammar Correction';
        const defaultPromptContent =
          `I want you to act as a spelling and grammar correction service.\n` +
          `I will give text to you to correct and return only the corrected version, no explanations.\n\n` +
          `\`\`\`\n%s\n\`\`\``;

        this.prompts.push({ name: defaultPromptName, content: defaultPromptContent });

        await this.saveOptions();

        this.updateContextMenu();
      }
    },

    async saveOptions() {
      const prompts = this.prompts.map((prompt) => ({
        name: prompt.name,
        content: prompt.content,
      }));

      if (this.apiKey !== '') {
        await browser.storage.sync.set({
          API_KEY: this.apiKey,
        });
      }

      await browser.storage.sync.set({
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        topP: this.topP,
        frequencyPenalty: this.frequencyPenalty,
        presencePenalty: this.presencePenalty,
        prompts: prompts,
      });

      await this.updateContextMenu();

      this.unsavedChanges = false;
    },

    async resetDefaults() {
      await browser.storage.sync.set(defaultConfig);
      await this.restoreOptions();
    },

    async updateContextMenu() {
      await browser.runtime.sendMessage({ type: 'updateContextMenu' });
    },

    async exportConfig() {
      const result = await browser.storage.sync.get(defaultConfig);
      delete result.API_KEY;

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "chatgpt-options-backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    },

    importConfig() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';

      fileInput.addEventListener('change', async (event) => {
        if (event && event.target) {
          const inputElement = event.target as HTMLInputElement;
          if (inputElement.files && inputElement.files.length > 0) {
            const file = inputElement.files[0];
            const reader = new FileReader();

            reader.onload = async (e) => {
              if (e.target) {
                const target = e.target as FileReader;
                if (target.result) {
                  try {
                    const config = JSON.parse(target.result as string);
                    if (config) {
                      await browser.storage.sync.set(config);
                      await this.restoreOptions();
                    }
                  } catch (error) {
                    console.error("Error parsing configuration file:", error);
                  }
                }
              }
            };

            reader.readAsText(file);
          }
        }
      });


      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    },
  },
});
</script>

<style scoped>
body {
  font-family: 'Arial', sans-serif;
}

table {
  width: 100%;
  margin-bottom: 20px;
}

td:first-child {
  width: 50%;
  padding-right: 10px;
  text-align: right;
}

input[type='text'],
textarea,
input[type='password'] {
  width: 100%;
  box-sizing: border-box;
  padding: 5px;
  margin: 5px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease-in-out;
}

input[type='text']:focus,
textarea:focus,
input[type='password']:focus {
  border-color: #0078d7;
}

input[type='submit'],
button {
  background-color: #0078d7;
  color: #fff;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

input[type='submit']:hover,
button:hover {
  background-color: #005fa3;
}

h1,
h2 {
  color: #0078d7;
}

.prompt-group {
  margin-bottom: 15px;
}

.prompt-group label {
  display: block;
  margin-top: 5px;
}

.prompt-content {
  line-height: 1.5;
  font-size: 14px;
  height: calc(1.5 * 7 * 14px);
  width: 100%;
  vertical-align: top;
}

#prompts button {
  margin-left: 10px;
}

#prompts-help {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

#addPrompt {
  margin-top: 10px;
}
</style>
