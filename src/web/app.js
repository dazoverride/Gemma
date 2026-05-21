window.COPY_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
window.CHECK_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

window.copyCode = function(button) {
    const container = button.closest('.code-block-container');
    if (!container) return;
    const codeEl = container.querySelector('code');
    if (!codeEl) return;
    
    const textToCopy = codeEl.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        button.innerHTML = window.CHECK_ICON_SVG;
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = window.COPY_ICON_SVG;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
        try {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            button.innerHTML = window.CHECK_ICON_SVG;
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = window.COPY_ICON_SVG;
                button.classList.remove('copied');
            }, 2000);
        } catch (e) {
            button.innerHTML = window.COPY_ICON_SVG;
        }
    });
};

window.copyMessage = function(button) {
    const bubble = button.closest('.message-bubble');
    if (!bubble) return;
    const textEl = bubble.querySelector('.message-text');
    if (!textEl) return;
    
    const textToCopy = textEl.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        button.innerHTML = window.CHECK_ICON_SVG;
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = window.COPY_ICON_SVG;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
        try {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            button.innerHTML = window.CHECK_ICON_SVG;
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = window.COPY_ICON_SVG;
                button.classList.remove('copied');
            }, 2000);
        } catch (e) {
            button.innerHTML = window.COPY_ICON_SVG;
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages-container');
    const tempSlider = document.getElementById('temp-slider');
    const tempVal = document.getElementById('temp-val');
    const systemPromptTextarea = document.getElementById('system-prompt');
    const thinkingToggle = document.getElementById('thinking-toggle');
    const advancedHeader = document.getElementById('advanced-header');
    const advancedAccordion = advancedHeader.closest('.advanced-accordion');
    
    const maxTokensSlider = document.getElementById('max-tokens-slider');
    const maxTokensVal = document.getElementById('max-tokens-val');
    const topPSlider = document.getElementById('top-p-slider');
    const topPVal = document.getElementById('top-p-val');
    const freqPenaltySlider = document.getElementById('freq-penalty-slider');
    const freqPenaltyVal = document.getElementById('freq-penalty-val');
    const presPenaltySlider = document.getElementById('pres-penalty-slider');
    const presPenaltyVal = document.getElementById('pres-penalty-val');

    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');

    // Estado del chat
    let conversationHistory = [];
    let currentConversationId = null;
    const API_URL = '/api/chat';
    const DB_API_URL = '/api/conversations';
    const LOGS_API_URL = '/api/logs';

    // Guardar log en la base de datos de logs
    async function saveInteractionLog(prompt, response, reasoning) {
        try {
            await fetch(LOGS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    response: response,
                    reasoning: reasoning,
                    temperature: parseFloat(tempSlider.value),
                    max_tokens: parseInt(maxTokensSlider.value),
                    thinking_enabled: thinkingToggle.checked
                })
            });
        } catch (error) {
            console.error('Error al guardar log de interacción:', error);
        }
    }

    // Cargar historial de conversaciones
    async function loadConversations() {
        try {
            const response = await fetch(DB_API_URL);
            if (!response.ok) throw new Error('Error al cargar conversaciones');
            const data = await response.json();
            
            if (!historyList) return;
            historyList.innerHTML = '';
            data.forEach(chat => {
                const item = document.createElement('div');
                item.className = `history-item${chat.id === currentConversationId ? ' active' : ''}`;
                item.dataset.id = chat.id;
                
                const titleSpan = document.createElement('span');
                titleSpan.className = 'history-item-title';
                titleSpan.textContent = chat.title;
                titleSpan.title = chat.title;
                item.appendChild(titleSpan);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-chat-btn';
                deleteBtn.title = 'Borrar conversación';
                deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteConversation(chat.id);
                });
                item.appendChild(deleteBtn);
                
                item.addEventListener('click', () => {
                    if (chat.id !== currentConversationId) {
                        selectConversation(chat.id);
                    }
                });
                
                historyList.appendChild(item);
            });
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    }

    // Seleccionar y cargar una conversación
    async function selectConversation(id) {
        currentConversationId = id;
        
        // Actualizar visualmente la lista activa
        document.querySelectorAll('.history-item').forEach(item => {
            if (parseInt(item.dataset.id) === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        try {
            const response = await fetch(`${DB_API_URL}/${id}`);
            if (!response.ok) throw new Error('Error al obtener detalles de la conversación');
            const data = await response.json();
            
            // Cargar parámetros en la UI
            thinkingToggle.checked = !!data.thinking;
            tempSlider.value = data.temperature;
            tempVal.textContent = data.temperature;
            maxTokensSlider.value = data.max_tokens;
            maxTokensVal.textContent = data.max_tokens;
            topPSlider.value = data.top_p;
            topPVal.textContent = data.top_p;
            freqPenaltySlider.value = data.frequency_penalty;
            freqPenaltyVal.textContent = parseFloat(data.frequency_penalty).toFixed(1);
            presPenaltySlider.value = data.presence_penalty;
            presPenaltyVal.textContent = parseFloat(data.presence_penalty).toFixed(1);
            systemPromptTextarea.value = data.system_prompt || '';
            
            // Cargar historial de mensajes
            conversationHistory = [];
            
            // Si el prompt del sistema está definido, lo añadimos como rol system
            if (data.system_prompt) {
                conversationHistory.push({ role: 'system', content: data.system_prompt });
            }
            
            // Agregar el resto de mensajes
            data.messages.forEach(msg => {
                if (msg.role !== 'system') {
                    conversationHistory.push(msg);
                }
            });
            
            // Renderizar en el chat
            messagesContainer.innerHTML = '';
            const chatMessages = conversationHistory.filter(msg => msg.role !== 'system');
            if (chatMessages.length === 0) {
                showWelcomeMessage();
            } else {
                chatMessages.forEach(msg => {
                    appendMessage(msg.role, msg.content);
                });
            }
        } catch (error) {
            console.error('Error al seleccionar conversación:', error);
        }
    }

    // Borrar una conversación
    async function deleteConversation(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta conversación?')) return;
        
        try {
            const response = await fetch(`${DB_API_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Error al borrar la conversación');
            
            if (currentConversationId === id) {
                startNewChat();
            }
            
            await loadConversations();
        } catch (error) {
            console.error('Error al borrar la conversación:', error);
        }
    }

    // Guardar/Actualizar estado actual de la conversación activa
    async function saveCurrentConversationState() {
        if (currentConversationId === null) return;
        
        const systemPrompt = systemPromptTextarea.value.trim();
        const messages = conversationHistory.filter(msg => msg.role !== 'system');
        
        try {
            await fetch(`${DB_API_URL}/${currentConversationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_prompt: systemPrompt,
                    temperature: parseFloat(tempSlider.value),
                    thinking: thinkingToggle.checked,
                    max_tokens: parseInt(maxTokensSlider.value),
                    top_p: parseFloat(topPSlider.value),
                    frequency_penalty: parseFloat(freqPenaltySlider.value),
                    presence_penalty: parseFloat(presPenaltySlider.value),
                    messages: messages
                })
            });
        } catch (error) {
            console.error('Error al guardar estado de conversación:', error);
        }
    }

    // Limpiar pantalla y comenzar chat nuevo
    function startNewChat() {
        currentConversationId = null;
        conversationHistory = [];
        
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Valores por defecto
        thinkingToggle.checked = false;
        tempSlider.value = 0.7;
        tempVal.textContent = '0.7';
        maxTokensSlider.value = 2048;
        maxTokensVal.textContent = '2048';
        topPSlider.value = 0.9;
        topPVal.textContent = '0.9';
        freqPenaltySlider.value = 0.0;
        freqPenaltyVal.textContent = '0.0';
        presPenaltySlider.value = 0.0;
        presPenaltyVal.textContent = '0.0';
        systemPromptTextarea.value = 'Eres un asistente de IA útil, atento e inteligente.';
        
        showWelcomeMessage();
    }

    // Mostrar mensaje de bienvenida original
    function showWelcomeMessage() {
        if (!messagesContainer) return;
        messagesContainer.innerHTML = `
            <div class="message assistant">
                <div class="avatar">
                    <svg class="ai-logo-svg" viewBox="0 0 100 100">
                        <circle class="ai-orbit" cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="160 100" />
                        <g class="ai-face">
                            <rect class="ai-eye eye-l" x="34" y="42" width="8" height="16" rx="4" fill="#fff" />
                            <rect class="ai-eye eye-r" x="58" y="42" width="8" height="16" rx="4" fill="#fff" />
                        </g>
                    </svg>
                </div>
                <div class="message-bubble">
                    <div class="message-text">
                        ¡Hola! Soy tu asistente de Inteligencia Artificial basado en el modelo local **Gemma-4-E2B**. 
                        Estoy listo para responder tus preguntas y ayudarte a razonar problemas. ¿En qué te puedo colaborar hoy?
                    </div>
                    <button class="copy-message-btn" onclick="copyMessage(this)" title="Copiar mensaje">
                        ${window.COPY_ICON_SVG}
                    </button>
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Guardado automático al cambiar ajustes
    function saveSettingsIfActive() {
        if (currentConversationId !== null) {
            saveCurrentConversationState();
        }
    }

    // Inicializar listeners de cambio en ajustes para autoguardado
    tempSlider.addEventListener('change', saveSettingsIfActive);
    thinkingToggle.addEventListener('change', saveSettingsIfActive);
    maxTokensSlider.addEventListener('change', saveSettingsIfActive);
    topPSlider.addEventListener('change', saveSettingsIfActive);
    freqPenaltySlider.addEventListener('change', saveSettingsIfActive);
    presPenaltySlider.addEventListener('change', saveSettingsIfActive);
    systemPromptTextarea.addEventListener('change', saveSettingsIfActive);

    // Cargar historial inicial al iniciar la app
    loadConversations();

    // Botón de nueva conversación
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }

    // Actualizar valor de temperatura visualmente
    tempSlider.addEventListener('input', (e) => {
        tempVal.textContent = e.target.value;
    });

    // Toggle para ajustes avanzados
    advancedHeader.addEventListener('click', () => {
        advancedAccordion.classList.toggle('open');
    });

    // Actualizar valores visuales
    maxTokensSlider.addEventListener('input', (e) => {
        maxTokensVal.textContent = e.target.value;
    });
    topPSlider.addEventListener('input', (e) => {
        topPVal.textContent = e.target.value;
    });
    freqPenaltySlider.addEventListener('input', (e) => {
        freqPenaltyVal.textContent = parseFloat(e.target.value).toFixed(1);
    });
    presPenaltySlider.addEventListener('input', (e) => {
        presPenaltyVal.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Auto-ajuste de altura del input
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight - 16) + 'px';
    });

    // Eventos de envío
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = chatInput.selectionStart;
            const end = chatInput.selectionEnd;
            chatInput.value = chatInput.value.substring(0, start) + "    " + chatInput.value.substring(end);
            chatInput.selectionStart = chatInput.selectionEnd = start + 4;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Limpiar entrada
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Agregar mensaje de usuario en UI
        appendMessage('user', text);

        // Preparar historial
        const systemPrompt = systemPromptTextarea.value.trim() || "Eres un asistente de IA útil.";
        
        // Inicializar el historial de conversación si es el primer mensaje
        if (conversationHistory.length === 0) {
            conversationHistory.push({ role: 'system', content: systemPrompt });
        } else {
            // Actualizar prompt del sistema si cambió
            conversationHistory[0].content = systemPrompt;
        }

        // Si es una conversación nueva (sin ID), guardarla primero en base de datos para obtener el ID
        if (currentConversationId === null) {
            let title = text.split(/\s+/).slice(0, 5).join(' ');
            if (title.length > 30) title = title.substring(0, 27) + '...';
            if (!title) title = 'Nueva conversación';
            
            try {
                const createRes = await fetch(DB_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,
                        system_prompt: systemPrompt,
                        temperature: parseFloat(tempSlider.value),
                        thinking: thinkingToggle.checked,
                        max_tokens: parseInt(maxTokensSlider.value),
                        top_p: parseFloat(topPSlider.value),
                        frequency_penalty: parseFloat(freqPenaltySlider.value),
                        presence_penalty: parseFloat(presPenaltySlider.value)
                    })
                });
                
                if (createRes.ok) {
                    const chatData = await createRes.json();
                    currentConversationId = chatData.id;
                    await loadConversations();
                }
            } catch (err) {
                console.error('Error al crear conversación:', err);
            }
        }

        conversationHistory.push({ role: 'user', content: text });

        // Guardar el mensaje del usuario de inmediato
        if (currentConversationId !== null) {
            saveCurrentConversationState();
        }

        // Crear burbuja de la IA vacía
        const aiMessageDiv = appendMessage('assistant', '');
        const bubble = aiMessageDiv.querySelector('.message-bubble');
        
        // Activar estado de generación animado en el logo y el avatar
        aiMessageDiv.classList.add('generating');
        const brandIcon = document.getElementById('brand-icon');
        if (brandIcon) brandIcon.classList.add('generating');
        
        // Crear elementos de thinking y respuesta
        let thinkingBlock = null;
        let thinkingContent = null;
        let responseContentSpan = document.createElement('span');
        responseContentSpan.className = 'message-text';
        bubble.appendChild(responseContentSpan);

        let fullReasoning = '';
        let fullResponse = '';

        try {
            // Enviar petición en streaming
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: conversationHistory,
                    stream: true,
                    temperature: parseFloat(tempSlider.value),
                    max_tokens: parseInt(maxTokensSlider.value),
                    top_p: parseFloat(topPSlider.value),
                    frequency_penalty: parseFloat(freqPenaltySlider.value),
                    presence_penalty: parseFloat(presPenaltySlider.value),
                    chat_template_kwargs: {
                        enable_thinking: thinkingToggle.checked
                    },
                    reasoning_budget: thinkingToggle.checked ? -1 : 0
                })
            });

            if (!response.ok) throw new Error('Error al conectar con el servidor.');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Mantener última línea incompleta en el buffer

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine.startsWith('data: ')) continue;
                    
                    const jsonStr = cleanLine.slice(6);
                    if (jsonStr === '[DONE]') break;

                    try {
                        const chunk = JSON.parse(jsonStr);
                        const delta = chunk.choices[0].delta;

                        // Extraer contenido de razonamiento (Thinking)
                        const reasoning = delta.reasoning_content;
                        if (reasoning !== undefined && reasoning !== null && reasoning !== '') {
                            // Check if scroll is at bottom before DOM update
                            const shouldScroll = (messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop) <= 80;

                            if (!thinkingBlock) {
                                // Crear bloque UI de Thinking
                                thinkingBlock = document.createElement('div');
                                thinkingBlock.className = 'thinking-block';
                                
                                const thinkingHeader = document.createElement('div');
                                thinkingHeader.className = 'thinking-header';
                                
                                const title = document.createElement('div');
                                title.className = 'thinking-title';
                                title.innerHTML = '<span class="thinking-loading-dot"></span> Pensando...';
                                
                                const arrow = document.createElement('span');
                                arrow.className = 'thinking-arrow';
                                arrow.innerHTML = '▲';
                                
                                thinkingHeader.appendChild(title);
                                thinkingHeader.appendChild(arrow);
                                
                                thinkingContent = document.createElement('div');
                                thinkingContent.className = 'thinking-content';
                                
                                thinkingBlock.appendChild(thinkingHeader);
                                thinkingBlock.appendChild(thinkingContent);
                                
                                // Insertar antes del texto de respuesta
                                bubble.insertBefore(thinkingBlock, responseContentSpan);
                                
                                // Evento para colapsar/expandir
                                thinkingHeader.addEventListener('click', () => {
                                    thinkingBlock.classList.toggle('collapsed');
                                });
                            }

                            fullReasoning += reasoning;
                            thinkingContent.textContent = fullReasoning;
                            
                            if (shouldScroll) {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        }

                        // Extraer contenido final
                        const content = delta.content;
                        if (content !== undefined && content !== null && content !== '') {
                            // Check if scroll is at bottom before DOM update
                            const shouldScroll = (messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop) <= 80;

                            // Si estábamos pensando y el modelo empieza a responder, remover el indicador de carga del header
                            if (thinkingBlock && thinkingBlock.querySelector('.thinking-loading-dot')) {
                                thinkingBlock.querySelector('.thinking-title').innerHTML = '🧠 Proceso de pensamiento';
                            }
                            
                            fullResponse += content;
                            responseContentSpan.innerHTML = formatMarkdown(fullResponse);
                            
                            if (shouldScroll) {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        }

                    } catch (e) {
                        // Ignorar errores de análisis de JSON parciales
                    }
                }
            }

            // Una vez terminada la generación, guardar en el historial
            conversationHistory.push({ role: 'assistant', content: fullResponse });
            
            if (currentConversationId !== null) {
                await saveCurrentConversationState();
            }

            // Guardar log en la base de datos de logs
            await saveInteractionLog(text, fullResponse, fullReasoning);

        } catch (error) {
            console.error(error);
            responseContentSpan.innerHTML = `<span style="color: var(--accent);">Error: No se pudo comunicar con el servidor local. Asegúrate de que run_server.bat está en ejecución.</span>`;
        } finally {
            // Detener animación de generación
            aiMessageDiv.classList.remove('generating');
            if (brandIcon) brandIcon.classList.remove('generating');
        }
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        if (sender === 'user') {
            avatar.textContent = 'U';
        } else {
            avatar.innerHTML = `
                <svg class="ai-logo-svg" viewBox="0 0 100 100">
                    <circle class="ai-orbit" cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="160 100" />
                    <g class="ai-face">
                        <rect class="ai-eye eye-l" x="34" y="42" width="8" height="16" rx="4" fill="#fff" />
                        <rect class="ai-eye eye-r" x="58" y="42" width="8" height="16" rx="4" fill="#fff" />
                    </g>
                </svg>
            `;
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        const markdownHtml = formatMarkdown(text);

        if (sender === 'user') {
            const MAX_CHARS = 400;
            const MAX_LINES = 5;
            const lineCount = text.split('\n').length;

            if (text.length > MAX_CHARS || lineCount > MAX_LINES) {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-bubble-content collapsed message-text';
                contentDiv.innerHTML = markdownHtml;

                const expandBtn = document.createElement('button');
                expandBtn.className = 'expand-btn';
                expandBtn.textContent = 'Mostrar más';

                expandBtn.addEventListener('click', () => {
                    const isCollapsed = contentDiv.classList.contains('collapsed');
                    if (isCollapsed) {
                        contentDiv.classList.remove('collapsed');
                        expandBtn.textContent = 'Mostrar menos';
                    } else {
                        contentDiv.classList.add('collapsed');
                        expandBtn.textContent = 'Mostrar más';
                    }
                });

                bubble.appendChild(contentDiv);
                bubble.appendChild(expandBtn);
            } else {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-text';
                contentDiv.innerHTML = markdownHtml;
                bubble.appendChild(contentDiv);
            }
        } else {
            // Es asistente
            if (text !== '') {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-text';
                contentDiv.innerHTML = markdownHtml;
                bubble.appendChild(contentDiv);
            }
        }

        // Añadir el botón de copiar mensaje completo
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-message-btn';
        copyBtn.title = 'Copiar mensaje';
        copyBtn.innerHTML = window.COPY_ICON_SVG;
        copyBtn.onclick = function() {
            window.copyMessage(copyBtn);
        };
        bubble.appendChild(copyBtn);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);

        // Auto-scroll
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return messageDiv;
    }

    // Parseador Markdown ultra-ligero para el chat
    function formatMarkdown(text) {
        if (!text) return '';
        
        // Normalizar saltos de línea para evitar problemas con retornos de carro (\r)
        let processedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 1. Extraer bloques de código para protegerlos de las transformaciones de Markdown
        const codeBlocks = [];
        
        // Manejar bloques de código con etiqueta de lenguaje opcional (ej. ```javascript)
        processedText = processedText.replace(/```\s*(\w*)\s*\n([\s\S]*?)```/g, (match, lang, code) => {
            const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
            codeBlocks.push({
                lang: lang || '',
                code: code.trim()
            });
            return placeholder;
        });

        // Manejar bloques de código sin salto de línea inmediatamente después de los backticks
        processedText = processedText.replace(/```([\s\S]*?)```/g, (match, code) => {
            const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
            codeBlocks.push({
                lang: '',
                code: code.trim()
            });
            return placeholder;
        });

        // 2. Escapar caracteres HTML especiales en el resto del texto
        let html = processedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 3. Código inline (`código`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 4. Negrita (**texto**)
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // 5. Convertir saltos de línea a <br> (sólo fuera de bloques de código)
        html = html.replace(/\n/g, '<br>');

        // 6. Restaurar y formatear bloques de código con su formato original e intacto (con el escape correcto)
        codeBlocks.forEach((block, index) => {
            const placeholder = `__CODE_BLOCK_PLACEHOLDER_${index}__`;
            
            // Escapar el código del bloque
            const escapedCode = block.code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
            const classAttr = block.lang ? ` class="language-${block.lang}"` : '';
            const langLabel = block.lang ? block.lang.toUpperCase() : 'CÓDIGO';
            
            const codeHtml = `<div class="code-block-container">` +
                                `<div class="code-block-header">` +
                                    `<span class="code-block-lang">${langLabel}</span>` +
                                    `<button class="copy-code-btn" onclick="copyCode(this)" title="Copiar código">${window.COPY_ICON_SVG}</button>` +
                                `</div>` +
                                `<pre><code${classAttr}>${escapedCode}</code></pre>` +
                             `</div>`;
            
            html = html.replace(placeholder, codeHtml);
        });

        return html;
    }
});
