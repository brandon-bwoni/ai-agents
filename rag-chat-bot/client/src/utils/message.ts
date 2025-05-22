import { Message } from '@/types';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: Message;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div 
      className={cn(
        "py-2 px-3 rounded-lg max-w-[80%] mb-2",
        isUser 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted text-muted-foreground"
      )}
    >
      <p className="text-sm">{message.content}</p>
      <p className="text-xs opacity-70 text-right mt-1">
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </p>
    </div>
  );
}