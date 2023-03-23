
import browser from "webextension-polyfill";

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    text: string;
    index: number;
    logprobs: any | null;
    finish_reason: string;
  }[];
}

interface Config {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  API_KEY: string;
}

interface ChatHistoryResult {
  chatHistory: any[];
}

interface CustomWebExtensionManifest {
  API_KEY?: string;
}

const defaultConfig: Config = {
  model: "gpt-3.5-turbo",
  temperature: 0.9,
  maxTokens: 64,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  API_KEY: "",
};

function getBrowserInstance(): typeof browser | typeof chrome {
  return typeof browser !== "undefined" ? browser : chrome;
}
async function updateContextMenu(): Promise<void> {
  const browser = getBrowserInstance();
  const { prompts } = await browser.storage.sync.get("prompts");
  const promptsArray: Prompt[] = Array.isArray(prompts) ? prompts : [];

  browser.contextMenus.removeAll();
  browser.contextMenus.create(
    {
      id: "chatgpt-root",
      title: browser.i18n.getMessage("menuTitle"),
      contexts: ["selection"],
    },
    onCreated
  );

  promptsArray.forEach((prompt: Prompt, index: number) => {
    browser.contextMenus.create(
      {
        id: `chatgpt-prompt-${index}`,
        parentId: "chatgpt-root",
        title: prompt.name,
        contexts: ["selection"],
      },
      onCreated
    );
  });
}

browser.runtime.onMessage.addListener((message: { type: string }): void => {
  if (message.type === "updateContextMenu") {
    updateContextMenu();
  }
});

async function loadRequestConfig(): Promise<null | Record<string, unknown>> {
  try {
    const config = await browser.storage.sync.get(defaultConfig);
    return {
      model: config.model,
      temperature: parseFloat(config.temperature.toString()),
      max_tokens: parseInt(config.maxTokens.toString()),
      top_p: parseFloat(config.topP.toString()),
      frequency_penalty: parseFloat(config.frequencyPenalty.toString()),
      presence_penalty: parseFloat(config.presencePenalty.toString()),
    };
  } catch (error) {
    console.error(`Failed to load request configuration: ${error}`);
    return null;
  }
}

async function updateClipboard(newClip: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(newClip);
    console.log(`Clipboard updated to: ${newClip}`);
  } catch (error) {
    console.error(`Failed to update clipboard: ${error}`);
  }
}

async function callOpenAIAPI(requestBody: Record<string, unknown>): Promise<null | OpenAIResponse> {
  try {
    const { API_KEY } = await browser.storage.sync.get("API_KEY");
    const apiKey = API_KEY || (browser.runtime.getManifest() as CustomWebExtensionManifest).API_KEY;
    if (!apiKey) {
      console.error("API key not found");
      return null;
    }

    const url = "https://api.openai.com/v1/chat/completions";

    startTimer();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    stopTimer();

    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

function onError(error: unknown): void {
  console.error(`Error: ${error}`);
}

let timerId: number;

function startTimer() {
  const startTime = new Date().getTime();
  timerId = window.setInterval(() => {
    const currentTime = new Date().getTime();
    const elapsedMs = currentTime - startTime;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
    browser.browserAction.setBadgeText({ text: `${elapsedSeconds}s` });
    browser.browserAction.setBadgeBackgroundColor({ color: "blue" });
  }, 100);
}

function stopTimer() {
  window.clearInterval(timerId);
  browser.browserAction.setBadgeText({ text: "" });
}

async function processSelection(
  info: browser.Menus.OnClickData,
  tab: browser.Tabs.Tab,
  customPrompt: string
): Promise<void> {
  const selectionText = info.selectionText || "";
  console.log(selectionText);

  const preparedPrompt = customPrompt.replace("%s", selectionText);
  const messages = [{ role: "user", content: preparedPrompt }];
  console.log(messages);

  const requestConfig = await loadRequestConfig();
  if (!requestConfig) {
    console.error("Failed to load request configuration");
    return;
  }

  const requestBody = { ...requestConfig, messages };
  const response: OpenAIResponse | null = await callOpenAIAPI(requestBody);

  if (response && response.choices && response.choices.length > 0) {
    const firstChoice = response.choices[0];
    let correctedText = firstChoice.text;
    if (firstChoice.finish_reason === "length") {
      correctedText += "...<truncated>";
    }

    updateClipboard(correctedText);

    const { chatHistory } = await browser.storage.local.get("chatHistory");
    const chatHistoryArray: ChatHistoryResult["chatHistory"] = Array.isArray(chatHistory) ? chatHistory : [];
    const updatedChatHistory = [
      ...(chatHistoryArray || []),
      {
        userMessage: info.selectionText,
        aiMessage: correctedText,
      },
    ];

    if (updatedChatHistory.length > 10) {
      updatedChatHistory.shift();
    }

    await browser.storage.local.set({ chatHistoryArray: updatedChatHistory });
  }

  console.log(`Response from OpenAI API: ${JSON.stringify(response, null, 2)}`);

  try {
    await browser.tabs.sendMessage(tab.id as number, {
      type: "api-response",
      response: response,
    });
  } catch (error) {
    onError(error);
  }
}

interface StorageObject {
  prompts: Array<{ content: string }>;
}

browser.menus.onClicked.addListener(async (info: browser.Menus.OnClickData, tab: browser.Tabs.Tab | undefined) => {
  if (!tab) {
    return;
  }

  const { prompts } = await browser.storage.sync.get('prompts');

  const promptIndex = prompts.findIndex((prompt: string, index: number) => info.menuItemId === `chatgpt-prompt-${index}`);

  if (promptIndex > -1) {
    const selectedPrompt = prompts[promptIndex];
    await processSelection(info, tab, selectedPrompt.content);
  }
});

interface Prompt {
  name: string;
  content: string;
}

function onCreated(): void {
  if (browser.runtime.lastError) {
    console.error(`Error: ${browser.runtime.lastError}`);
  }
}