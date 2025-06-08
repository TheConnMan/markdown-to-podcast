class PodcastGenerator {
    constructor() {
        this.apiKey = null;
        this.baseUrl = window.location.origin;
        
        this.initializeElements();
        this.loadApiKey();
        this.setupEventListeners();
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('podcast-form');
        this.contentTextarea = document.getElementById('content');
        this.urlInput = document.getElementById('url');
        this.voiceSelect = document.getElementById('voice');
        
        // Input type radios
        this.inputTypeText = document.getElementById('input-type-text');
        this.inputTypeUrl = document.getElementById('input-type-url');
        this.contentInput = document.getElementById('content-input');
        this.urlInputDiv = document.getElementById('url-input');
        
        // API key elements
        this.apiKeySetup = document.getElementById('api-key-setup');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        
        // Generation elements
        this.generateBtn = document.getElementById('generate-btn');
        this.generateIcon = document.getElementById('generate-icon');
        this.generateText = document.getElementById('generate-text');
        
        // Status elements
        this.progressDiv = document.getElementById('generation-progress');
        this.progressMessage = document.getElementById('progress-message');
        this.resultsDiv = document.getElementById('generation-results');
        this.errorDiv = document.getElementById('error-display');
        this.errorMessage = document.getElementById('error-message');
        
        // Result elements
        this.resultTitle = document.getElementById('result-title');
        this.rssUrl = document.getElementById('rss-url');
        this.copyRssBtn = document.getElementById('copy-rss-url');
    }

    setupEventListeners() {
        // Input type toggle
        this.inputTypeText.addEventListener('change', () => this.toggleInputType());
        this.inputTypeUrl.addEventListener('change', () => this.toggleInputType());
        
        // API key management
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Copy RSS URL
        this.copyRssBtn.addEventListener('click', () => this.copyRssUrl());
        
        // URL input pre-fill from query params
        this.prefillFromQueryParams();
    }

    loadApiKey() {
        this.apiKey = localStorage.getItem('podcast_api_key');
        if (!this.apiKey) {
            this.showApiKeySetup();
        }
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.showError('Please enter an API key');
            return;
        }
        
        localStorage.setItem('podcast_api_key', key);
        this.apiKey = key;
        this.hideApiKeySetup();
        this.hideError();
    }

    showApiKeySetup() {
        this.apiKeySetup.classList.remove('hidden');
        this.apiKeySetup.classList.add('fade-in');
    }

    hideApiKeySetup() {
        this.apiKeySetup.classList.add('hidden');
    }

    toggleInputType() {
        if (this.inputTypeText.checked) {
            this.contentInput.classList.remove('hidden');
            this.urlInputDiv.classList.add('hidden');
            this.contentTextarea.required = true;
            this.urlInput.required = false;
        } else {
            this.contentInput.classList.add('hidden');
            this.urlInputDiv.classList.remove('hidden');
            this.contentTextarea.required = false;
            this.urlInput.required = true;
        }
    }

    prefillFromQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const url = params.get('url');
        const text = params.get('text');
        
        if (url) {
            this.inputTypeUrl.checked = true;
            this.urlInput.value = url;
            this.toggleInputType();
        } else if (text) {
            this.inputTypeText.checked = true;
            this.contentTextarea.value = text;
            this.toggleInputType();
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (!this.apiKey) {
            this.showError('API key is required');
            this.showApiKeySetup();
            return;
        }

        this.hideError();
        this.hideResults();
        this.showProgress('Processing content...');
        this.setGenerating(true);

        try {
            const formData = new FormData(this.form);
            const data = {
                voice: formData.get('voice'),
            };

            if (this.inputTypeText.checked) {
                data.content = formData.get('content');
                if (!data.content.trim()) {
                    throw new Error('Please enter some content');
                }
            } else {
                data.url = formData.get('url');
                if (!data.url.trim()) {
                    throw new Error('Please enter a URL');
                }
            }

            this.updateProgress('Generating audio...');
            const response = await this.generatePodcast(data);
            
            this.hideProgress();
            this.showResults(response);
            
        } catch (error) {
            console.error('Generation error:', error);
            this.hideProgress();
            this.showError(error.message);
        } finally {
            this.setGenerating(false);
        }
    }

    async generatePodcast(data) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    setGenerating(isGenerating) {
        this.generateBtn.disabled = isGenerating;
        
        if (isGenerating) {
            this.generateIcon.innerHTML = `
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;
            this.generateText.textContent = 'Generating...';
        } else {
            this.generateIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            `;
            this.generateText.textContent = 'Generate Podcast';
        }
    }

    showProgress(message) {
        this.progressMessage.textContent = message;
        this.progressDiv.classList.remove('hidden');
        this.progressDiv.classList.add('fade-in');
    }

    updateProgress(message) {
        this.progressMessage.textContent = message;
    }

    hideProgress() {
        this.progressDiv.classList.add('hidden');
    }

    showResults(response) {
        // Extract title from response message or use default
        const titleMatch = response.message.match(/: \"(.*?)\"/) || response.message.match(/Episode generated: (.*)/);
        const title = titleMatch ? titleMatch[1] : response.title || 'Generated Episode';
        
        this.resultTitle.textContent = title;
        
        // Generate RSS URL
        const rssUrl = `${this.baseUrl}/podcast/${this.getPodcastUuid()}`;
        this.rssUrl.value = rssUrl;
        
        this.resultsDiv.classList.remove('hidden');
        this.resultsDiv.classList.add('fade-in');
        
        // Scroll to results
        this.resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    hideResults() {
        this.resultsDiv.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorDiv.classList.remove('hidden');
        this.errorDiv.classList.add('fade-in');
        
        // Scroll to error
        this.errorDiv.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.errorDiv.classList.add('hidden');
    }

    async copyRssUrl() {
        try {
            await navigator.clipboard.writeText(this.rssUrl.value);
            
            // Temporary feedback
            const originalText = this.copyRssBtn.textContent;
            this.copyRssBtn.textContent = 'Copied!';
            this.copyRssBtn.classList.add('bg-green-50', 'text-green-700');
            
            setTimeout(() => {
                this.copyRssBtn.textContent = originalText;
                this.copyRssBtn.classList.remove('bg-green-50', 'text-green-700');
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            // Fallback: select the text
            this.rssUrl.select();
        }
    }

    getPodcastUuid() {
        // This should match the PODCAST_UUID from the server
        // In a real app, this might be fetched from a config endpoint
        return 'abcd1234-5678-90ef-ghij-klmnop123456';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PodcastGenerator();
});