/**
 * NodeResultFooter — shows a live peek of a node's output right on the node as
 * the pipeline streams results (set via data.__result during execution).
 * Renders nothing until the node has produced something.
 */
export default function NodeResultFooter({ result }) {
  if (!result) return null;
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  return (
    <div
      className="nodrag nowheel"
      style={{
        marginTop: 8, padding: '8px 10px', background: 'rgba(48,209,88,.1)',
        border: '1px solid rgba(48,209,88,.3)', borderRadius: 6, fontSize: '0.72rem',
        color: '#7fe0a0', maxHeight: 260, overflowY: 'auto', whiteSpace: 'pre-wrap',
        wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.5,
      }}
    >
      {text.length > 1200 ? text.slice(0, 1200) + '…' : text}
    </div>
  );
}
