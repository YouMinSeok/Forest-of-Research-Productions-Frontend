import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faPaperPlane,
  faRobot,
  faUser,
  faLightbulb,


} from '@fortawesome/free-solid-svg-icons';
import './AIModal.css';
import { aiApi } from '../api/ai';

function AIModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [currentTypingText, setCurrentTypingText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // AI 답변 포맷팅 함수
  const formatAIResponse = (text) => {
    if (!text) return text;

    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(
      /^(\d+)\.\s+(.+)$/gm,
      '<div class="ai-list-item numbered"><span class="ai-list-number">$1.</span> $2</div>'
    );
    formatted = formatted.replace(
      /^[-•]\s+(.+)$/gm,
      '<div class="ai-list-item bulleted"><span class="ai-list-bullet">•</span> $1</div>'
    );
    formatted = formatted.replace(/\n\n/g, '</p><p class="ai-paragraph">');
    formatted = formatted.replace(/\n/g, '<br>');

    if (formatted && !formatted.includes('<p')) {
      formatted = `<p class="ai-paragraph">${formatted}</p>`;
    }

    return formatted;
  };

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
      if (messages.length === 0) {
        setMessages([
          {
            id: Date.now(),
            type: 'ai',
            content: '안녕하세요! 구름이AI입니다. 무엇을 도와드릴까요? 🤖',
            timestamp: new Date(),
            isWelcome: true
          }
        ]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSuggestions = async () => {
    try {
      const response = await aiApi.getSuggestions();
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('제안 로드 실패:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setTypingMessageId(null);
    setCurrentTypingText('');
  };

  useEffect(() => {
    return () => {
      clearTyping();
    };
  }, []);

  const handleSendMessage = async (messageText) => {
    const message = messageText || inputMessage.trim();
    if (!message || isLoading || isTyping) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    // AI 메시지 자리 추가
    const aiMessageId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date(),
        sourceReferences: [],
        isStreaming: true
      }
    ]);
    setIsTyping(true);
    setTypingMessageId(aiMessageId);
    setCurrentTypingText('');

    try {
      await aiApi.chatStream(
        message,
        conversationId,
        (token, fullMessage, data) => {
          setCurrentTypingText(fullMessage);
          if (data.conversation_id && !conversationId) {
            setConversationId(data.conversation_id);
          }
        },
        (finalData) => {
          setIsTyping(false);
          setTypingMessageId(null);
          setCurrentTypingText('');
          setIsLoading(false);
          if (finalData.conversation_id && !conversationId) {
            setConversationId(finalData.conversation_id);
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: finalData.message || finalData.response,
                    timestamp: new Date(finalData.timestamp),
                    sourceReferences: finalData.source_references || [],
                    isStreaming: false,
                    isComplete: true
                  }
                : msg
            )
          );
        },
        (error) => {
          console.error('AI 스트리밍 에러:', error);
          setIsTyping(false);
          setTypingMessageId(null);
          setCurrentTypingText('');
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content:
                      '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                    isError: true,
                    isStreaming: false
                  }
                : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('AI 스트리밍 요청 실패:', error);
      setIsTyping(false);
      setTypingMessageId(null);
      setCurrentTypingText('');
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content:
                  '네트워크 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
                isError: true,
                isStreaming: false
              }
            : msg
        )
      );
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([
      {
        id: Date.now(),
        type: 'ai',
        content: '새로운 대화를 시작합니다! 무엇을 도와드릴까요? 🤖',
        timestamp: new Date(),
        isWelcome: true
      }
    ]);
    setInputMessage('');
    setShowSuggestions(true);
  };

  if (!isOpen) return null;

  return (
    <div className={`ai-sidebar-container ${isOpen ? 'open' : 'closed'}`}>
      {/* 사이드바 토글 버튼 */}
      {!isOpen && (
        <button className="ai-sidebar-toggle" onClick={() => window.location.reload()}>
          <FontAwesomeIcon icon={faRobot} />
          <span>AI 채팅</span>
        </button>
      )}

      <div className="ai-sidebar">
        {/* Header */}
        <div className="ai-sidebar-header">
          <div className="ai-sidebar-title">
            <FontAwesomeIcon icon={faRobot} className="ai-icon" />
            <span>구름이AI</span>
          </div>
          <div className="ai-sidebar-controls">

            <button
              className="ai-control-btn"
              onClick={onClose}
              title="닫기"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

            {/* Messages */}
            <div className="ai-messages-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-message ${message.type} ${
                    message.isWelcome ? 'welcome' : ''
                  } ${message.isError ? 'error' : ''}`}
                >
                  <div className="ai-message-avatar">
                    <FontAwesomeIcon
                      icon={message.type === 'user' ? faUser : faRobot}
                    />
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-text">
                      {message.id === typingMessageId ? (
                        <div className="typing-text">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatAIResponse(currentTypingText)
                            }}
                          />
                          <span className="typing-cursor" />
                        </div>
                      ) : (
                        <div
                          className="ai-formatted-content"
                          dangerouslySetInnerHTML={{
                            __html: formatAIResponse(message.content)
                          }}
                        />
                      )}
                    </div>
                    {message.sourceReferences &&
                      message.sourceReferences.length > 0 && (
                        <div className="ai-source-references">
                          <small>
                            참고: {message.sourceReferences.join(', ')}
                          </small>
                        </div>
                      )}
                    <div className="ai-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="ai-message ai typing">
                  <div className="ai-message-avatar">
                    <FontAwesomeIcon icon={faRobot} />
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-typing-indicator">
                      <div className="ai-typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <span>AI가 답변을 생성하고 있습니다...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="ai-suggestions">
                <div className="ai-suggestions-title">
                  <FontAwesomeIcon icon={faLightbulb} />
                  <span style={{ marginLeft: 8 }}>추천 질문</span>
                </div>
                <div className="ai-suggestions-list">
                  {suggestions.slice(0, 4).map((sugg) => (
                    <div
                      key={sugg}
                      className="ai-suggestion-item"
                      onClick={() => handleSuggestionClick(sugg)}
                    >
                      {sugg}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="ai-input-container">
              <button
                onClick={startNewConversation}
                className="ai-clear-button"
                disabled={isLoading}
                title="새로운 대화를 시작합니다"
              >
                🔄 새 대화
              </button>
              <div className="ai-input-wrapper">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="질문을 입력하세요..."
                  rows={1}
                  disabled={isLoading || isTyping}
                  className="ai-input-field"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading || isTyping}
                  className="ai-send-button"
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </div>
            </div>
      </div>
    </div>
  );
}

export default AIModal;
