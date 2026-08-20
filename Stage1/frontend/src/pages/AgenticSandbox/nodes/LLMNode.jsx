import { Handle, Position } from '@xyflow/react';

export default function LLMNode({ data }) {
  return (
    <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-3 shadow-md min-w-[150px] text-white">
      {/* Input handle for data to flow INTO this node */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
      
      <div className="text-xs font-bold text-purple-300 uppercase mb-2">🧠 The Decider (LLM)</div>
      <div className="text-xs text-gray-300">
        {data.prompt || "Processes text"}
      </div>

      {/* Output handle for data to flow OUT of this node */}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}
