import { Handle, Position } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';
import NodeInfo from "./NodeInfo.jsx";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ChartGeneratorNode({ data }) {
  let chartData = null;
  
  if (data.output) {
    try {
      chartData = JSON.parse(data.output);
    } catch {
      // Raw text if not JSON
    }
  }

  const renderChart = () => {
    if (!chartData || !chartData.type || !chartData.data) {
      return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>📊 Waiting for chart data...</div>;
    }
    
    if (chartData.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 10}} />
            <YAxis stroke="var(--text-secondary)" tick={{fontSize: 10}} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Bar dataKey="value" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (chartData.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 10}} />
            <YAxis stroke="var(--text-secondary)" tick={{fontSize: 10}} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Line type="monotone" dataKey="value" stroke="var(--accent-green)" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartData.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({name}) => name} labelLine={false}>
              {chartData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    return <div style={{color: 'var(--accent-red)'}}>Unsupported chart type</div>;
  };

  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-green)', minWidth: '300px' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-green)' }}>
        <BarChart3 size={16} /> <span>Chart Generator</span>
        <NodeInfo type="chartGenerator" />
      </div>
      <div className="custom-node-box" style={{ borderColor: 'var(--accent-green)', padding: '10px' }}>
        {data.output && !chartData ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxHeight: '200px', overflowY: 'auto' }}>
            {data.output}
          </div>
        ) : renderChart()}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
