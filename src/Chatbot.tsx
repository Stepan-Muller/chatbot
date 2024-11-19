import React, { useState, useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import axios from 'axios';

interface Message {
  text: string | JSX.Element[];  // Allow text to be either string or JSX elements
  isUser: boolean;
}

const md = new MarkdownIt({
  html: true, // Enable HTML in Markdown
});


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null); 

  const renderLatexInText = (text: string) => {
    // Match LaTeX patterns: $$...$$, $...$, \[...\], \(...\)
    const latexRegex = /(\$\$.*?\$\$|\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\))/g;

    const parts = text.split(latexRegex);

    return parts.map((part, index) => {
      if (latexRegex.test(part)) {
        const cleanedPart = part
          .replace(/^\$+|\$+$/g, '')        // Remove $...$
          .replace(/^\\\(|\\\)$/g, '')     // Remove \( ... \)
          .replace(/^\\\[|\\\]$/g, '');    // Remove \[ ... \]

        const isBlockMath = part.startsWith('$$') || part.startsWith('\\[');
        
        return (
          <span
            key={index}
            className={isBlockMath ? "latex-block" : "latex-inline"}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(cleanedPart, {
                throwOnError: false,
                displayMode: isBlockMath,
              }),
            }}
          />
        );
      }

      return (
        <span
          key={index}
          dangerouslySetInnerHTML={{
            __html: md.renderInline(part),
          }}
        />
      );

    });
  };

  const handleSend = async (): Promise<void> => {
    if (input.trim()) {
      const newMessages = [
        ...messages,
        { text: input, isUser: true },
      ];
      setMessages(newMessages);
      setInput('');

      try {
        const requestData = {
          messages: [
            { role: "system", content: "You are a helpful chatbot capable of rendering LaTeX and answering questions based on previous messages." },
            ...newMessages.map((msg) => ({
              role: msg.isUser ? "user" : "assistant",
              content: typeof msg.text === "string" ? msg.text : "", // Convert JSX to plain string for API
            })),
          ],
          model: "grok-beta",
          stream: false,
          temperature: 0.7,
        };

        const response = await axios.post(
          'https://api.x.ai/v1/chat/completions',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': process.env.REACT_APP_XAI_API_KEY,
            },
          }
        );
        
        const xAIResponse = response.data.choices[0]?.message.content;

        const updatedMessages = [
          ...newMessages,
          { text: renderLatexInText(xAIResponse), isUser: false },
        ];
        setMessages(updatedMessages);
      } catch (error) {
        console.error('Error communicating with xAI API:', error);
      }
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' }); // Scroll to the bottom
    }
  }, [messages]);

  return (
    <div className="h-screen w-screen p-4" ref={messageContainerRef}>
      {messages.map((msg, index) => (
        <div key={index} className={`mb-4 flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`p-2 rounded-lg ${msg.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
            {Array.isArray(msg.text) ? msg.text : renderLatexInText(msg.text)}
          </div>
        </div>
      ))}

<div ref={bottomRef} />

      <div className='pb-4 sticky bottom-0'>
        <div className='rounded-lg bg-blue-500'>
          <div className={`text-white ${input.length != 0 ? 'p-2' : ''}`}>
            {renderLatexInText(input)}
          </div>
          <div className="flex">
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-l-lg"
              value={input}
              onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              placeholder="Enter LaTeX expression or text"
            />
            <button
              className="p-2 bg-blue-500 text-white rounded-r-lg"
              onClick={handleSend}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
