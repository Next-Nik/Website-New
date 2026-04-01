export function ChatBubble({ role, content }) {
  return (
    <div className={`bubble bubble-${role}`}>
      {content}
    </div>
  )
}
