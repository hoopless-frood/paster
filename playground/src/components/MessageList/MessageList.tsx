import type { MessageListProps } from "./MessageList.types";
import styles from "./MessageList.module.css";

export type { MessageListProps } from "./MessageList.types";

export function MessageList({ messages, tone = "error" }: MessageListProps) {
  if (messages.length === 0) {
    return null;
  }

  const isError = tone === "error";
  const noun = isError ? "problem" : "note";

  return (
    <div role={isError ? "alert" : "status"} className={isError ? styles.error : styles.warning}>
      <p>{messages.length === 1 ? `There's a ${noun}:` : `There are ${messages.length} ${noun}s:`}</p>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
