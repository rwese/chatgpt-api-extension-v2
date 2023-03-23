<template>
  <div>
    <h1>ChatGPT History</h1>
    <button id="configButton" @click="openOptionsPage">Configuration</button>
    <div id="chatHistoryContainer">
      <p v-if="!chatHistory || chatHistory.length === 0">No chat history found.</p>
      <div v-else v-for="entry in chatHistory" :key="entry.id" class="chat-entry">
        <div class="user-message">
          {{ entry.userMessage }}
          <img
            src="../../assets/copy.svg"
            class="copy-icon"
            @click="copyToClipboard(entry.userMessage)"
          />
        </div>
        <div class="ai-message">
          {{ entry.aiMessage }}
          <img
            src="../../assets/copy.svg"
            class="copy-icon"
            @click="copyToClipboard(entry.aiMessage)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import browser from "webextension-polyfill";
import { ref, onMounted } from 'vue';

interface ChatEntry {
  id: number;
  userMessage: string;
  aiMessage: string;
}

interface ChatHistoryStorage {
  chatHistory: ChatEntry[];
}

function getChatHistory(): Promise<ChatHistoryStorage> {
  return browser.storage.local.get('chatHistory') as Promise<ChatHistoryStorage>;
}

let chatHistory = ref<ChatEntry[]>([]);

  async function loadChatHistory() {
  const { chatHistory: storedChatHistory } = (await getChatHistory()) || {};
  if (storedChatHistory) {
    chatHistory.value = storedChatHistory;
  }
}

onMounted(loadChatHistory);

function openOptionsPage() {
  browser.runtime.openOptionsPage();
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}
</script>

<style>
body {
  font-family: Arial, sans-serif;
  margin: 10px;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
}

.chat-entry {
  margin-bottom: 10px;
}

.user-message,
.ai-message {
  margin-bottom: 5px;
  padding: 5px 10px;
  border-radius: 5px;
  width: 100%;
}

.user-message {
  background-color: #e9ecef;
}

.ai-message {
  background-color: #bee5eb;
}

.copy-icon {
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-left: 8px;
  float: right;
}

.user-message,
.ai-message {
  display: inline-block;
  vertical-align: middle;
}
</style>
