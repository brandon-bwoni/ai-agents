"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

const API_URL = "http://localhost:3001/api";

export default function MessageBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add welcome message when component mounts
  useEffect(() => {
    const welcomeMessage: Message = {
      id: uuidv4(),
      content: "Thank you for contacting Webox. How may we assist you today?",
      role: "assistant",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Format conversation history for the RAG backend
  const formatConversationHistory = (msgs: Message[]) => {
    return msgs
      .slice(-6) // Only use last 6 messages for context
      .map((msg) => `${msg.role === "user" ? "Human" : "AI"}: ${msg.content}`)
      .join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create and add user message
    const userMessage: Message = {
      id: uuidv4(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get conversation history
      const history = formatConversationHistory(messages);

      // Call the backend API
      const response = await axios.post(`${API_URL}/chat`, {
        question: userMessage.content,
        conv_history: history,
      });

      // Create and add assistant response
      const assistantMessage: Message = {
        id: uuidv4(),
        content:
          response.data.answer || "I'm sorry, I couldn't process your request.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting response:", error);

      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error. Please try again later.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="w-full max-w-2xl mx-auto space-y-4 p-4">
      <Card className="bg-primary text-primary-foreground">
        <CardHeader className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            Webox Chatbot
          </p>
        </CardHeader>
      </Card>

      <Card
        className="h-[400px] overflow-y-auto"
        id="chatbot-conversation-container"
      >
        <CardContent className="p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`py-2 px-3 rounded-lg mb-2 bg-gray-100 text-start ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted text-muted-foreground"
              } ${msg.role === "user" ? "max-w-[70%] ml-auto" : "max-w-[70%]"}`}
            >
              <p>{msg.content}</p>
              <p className="text-xs opacity-70 text-start mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}

          {isLoading && (
            <div className="bg-muted py-2 px-3 rounded-lg max-w-[70%] flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          id="user-input"
          name="user-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="flex-grow"
          disabled={isLoading}
          required
        />
        <Button type="submit" id="submit-btn" size="icon" disabled={isLoading}>
          <SendHorizontal width={24} height={24} />
        </Button>
      </form>
    </section>
  );
}
