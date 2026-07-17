/**
 * NodeResultFooter — shows a live peek of a node's output right on the node as
 * the pipeline streams results (set via data.__result during execution).
 * Renders nothing until the node has produced something.
 */
export default function NodeResultFooter({ result }) {
  if (!result) return null;
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  return (
    <div
      className="nowheel"
      style={{
        marginTop: 8, padding: '6px 8px', background: 'rgba(48,209,88,.1)',
        border: '1px solid rgba(48,209,88,.3)', borderRadius: 6, fontSize: '0.68rem',
        color: '#7fe0a0', maxHeight: 96, overflowY: 'auto', whiteSpace: 'pre-wrap',
        wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.45,
      }}
    >
      {text.length > 260 ? text.slice(0, 260) + '…' : text}
    </div>
  );
}
