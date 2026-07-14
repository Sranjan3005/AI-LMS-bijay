import React, { useState } from 'react';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Smartphone, 
  Heart, MessageCircle, BarChart2, Save, AlertTriangle, Target, UploadCloud
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ZAxis
} from 'recharts';
import api from '../../api';

const SocialMediaDataLab = ({ scenario, onBackToDashboard, onOpenDemonstration }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState([
    { likes: '', comments: '' },
    { likes: '', comments: '' },
    { likes: '', comments: '' }
  ]);
  const [variantName, setVariantName] = useState('My Social Media Data');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleRowChange = (index, field, value) => {
    const newData = [...data];
    // Allow empty string, otherwise parse as number
    newData[index] = { ...newData[index], [field]: value === '' ? '' : Number(value) };
    setData(newData);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length > 1) { // has header and data
        const newRows = lines.slice(1).map(line => {
          const cols = line.split(',');
          return {
            likes: cols[0] ? Number(cols[0].trim()) : '',
            comments: cols[1] ? Number(cols[1].trim()) : ''
          };
        }).filter(row => !isNaN(row.likes) && !isNaN(row.comments) && row.likes !== '' && row.comments !== '');
        
        if (newRows.length > 0) {
          setData(newRows);
        } else {
          setError("Could not find valid numeric data in CSV. Ensure columns are Likes, Comments.");
        }
      }
    };
    reader.readAsText(file);
  };

  const addRow = () => {
    setData([...data, { likes: '', comments: '' }]);
  };

  const removeRow = (index) => {
    if (data.length > 1) {
      const newData = [...data];
      newData.splice(index, 1);
      setData(newData);
    }
  };

  const getValidData = () => {
    return data.filter(d => d.likes !== '' && d.comments !== '');
  };

  const handleSaveToPredictionEngine = async () => {
    const validData = getValidData();
    if (validData.length < 3) {
      setError("Please enter at least 3 valid data points to save.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await api.post('/scenarios/upload-json/', {
        scenario_id: scenario.id,
        name: `social_media_${Date.now()}`,
        label: variantName,
        data: validData
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "An error occurred while saving data.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '40px', flexWrap: 'wrap' }}>
      {[
        { i: 1, label: 'Scenario' },
        { i: 2, label: 'Parameters' },
        { i: 3, label: 'Collection' },
        { i: 4, label: 'Data Entry' },
        { i: 5, label: 'Visualization' }
      ].map((s, index, arr) => (
        <React.Fragment key={s.i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <div style={{ 
              width: '35px', height: '35px', borderRadius: '50%', 
              background: step >= s.i ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
              color: step >= s.i ? '#000' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1rem',
              boxShadow: step === s.i ? '0 0 15px var(--accent-cyan)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {s.i}
            </div>
            <span style={{ 
              fontSize: '0.75rem', 
              color: step >= s.i ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: step === s.i ? 'bold' : 'normal'
            }}>
              {s.label}
            </span>
          </div>
          {index < arr.length - 1 && (
            <div style={{ 
              height: '3px', width: '30px', 
              background: step > s.i ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', 
              borderRadius: '2px',
              marginTop: '-20px'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '40px', maxWidth: '1040px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '15px', textAlign: 'center' }}>
          Data Collection: {scenario.title}
        </h2>
        
        {renderStepIndicator()}

        {/* STEP 1: The Scenario */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <Smartphone size={32} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-cyan)' }}>1. What is the Scenario?</h3>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '30px' }}>
              Social media algorithms are driven by numbers. Have you ever wondered if a post getting more 
              <strong> Likes</strong> automatically means it will get more <strong>Comments</strong>? Let's build an AI model to find out!
            </p>

            <div style={{ 
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
              borderRadius: '16px', padding: '20px', maxWidth: '400px', margin: '0 auto 30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              {/* Instagram Post Mockup */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }} />
                <span style={{ fontWeight: 'bold' }}>cool_creator_99</span>
              </div>
              <div style={{ width: '100%', height: '300px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '4rem' }}>🌴✈️📸</span>
              </div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff3040' }}>
                  <Heart size={24} fill="#ff3040" /> <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>1,245</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#00F0FF' }}>
                  <MessageCircle size={24} /> <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>87</span>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>cool_creator_99</strong> Exploring the world! 🌍✨
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setStep(2)}>
                Next: Parameters <ArrowRight size={18} style={{ marginLeft: '10px' }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Parameters */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <BarChart2 size={32} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-purple)' }}>2. Parameters & Features</h3>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '20px' }}>
              We are building a <strong>Linear Regression</strong> model. This model tries to draw a straight line through data to predict a future number.
            </p>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px', background: 'rgba(255, 48, 64, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 48, 64, 0.3)' }}>
                <h4 style={{ color: '#ff3040', margin: '0 0 10px 0', fontSize: '1.2rem' }}>X (Input Feature)</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem', fontWeight: 'bold' }}>
                  <Heart size={24} /> Number of Likes
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  The AI looks at this number to figure out how popular the post is.
                </p>
              </div>

              <div style={{ flex: 1, minWidth: '250px', background: 'rgba(0, 240, 255, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                <h4 style={{ color: '#00F0FF', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Y (Output Target)</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem', fontWeight: 'bold' }}>
                  <MessageCircle size={24} /> Number of Comments
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  This is what the AI is trying to <em>predict</em>!
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={18} style={{ marginRight: '10px' }} /> Back
              </button>
              <button className="btn-primary" onClick={() => setStep(3)}>
                Next: Collection <ArrowRight size={18} style={{ marginLeft: '10px' }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Data Collection */}
        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <Smartphone size={32} color="#00FF88" />
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#00FF88' }}>3. How to Collect Data</h3>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '30px' }}>
              Now it's your turn to be a Data Scientist! Follow these steps to collect real-world data:
            </p>

            <ol style={{ fontSize: '1.1rem', lineHeight: '2', color: 'var(--text-secondary)', paddingLeft: '20px', marginBottom: '40px' }}>
              <li>Open Instagram, YouTube, or your favorite social media app.</li>
              <li>Scroll through your feed and pick <strong>random posts</strong> (don't just pick viral ones!).</li>
              <li>For each post, write down how many <strong>Likes (X)</strong> and <strong>Comments (Y)</strong> it has.</li>
              <li>Do this for at least 5-10 different posts. The more data, the smarter the AI!</li>
            </ol>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={18} style={{ marginRight: '10px' }} /> Back
              </button>
              <button className="btn-primary" onClick={() => setStep(4)}>
                Next: Enter Data <ArrowRight size={18} style={{ marginLeft: '10px' }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Data Entry Table */}
        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <Target size={32} color="#FFCC00" />
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#FFCC00' }}>4. Data Entry</h3>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Enter the Likes and Comments you collected into the table below. This will be exported as a dataset for our AI.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px', gap: '10px', marginBottom: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', padding: '0 10px' }}>
                <div>Row</div>
                <div>X (Likes)</div>
                <div>Y (Comments)</div>
                <div></div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>#{i + 1}</div>
                    <input 
                      type="number" 
                      placeholder="e.g. 150"
                      value={row.likes}
                      onChange={(e) => handleRowChange(i, 'likes', e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    />
                    <input 
                      type="number" 
                      placeholder="e.g. 12"
                      value={row.comments}
                      onChange={(e) => handleRowChange(i, 'comments', e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    />
                    <button 
                      onClick={() => removeRow(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', opacity: data.length > 1 ? 1 : 0.3 }}
                      disabled={data.length <= 1}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button 
                  onClick={addRow}
                  style={{ flex: 1, padding: '10px 15px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + Add Another Post
                </button>

                <label style={{ flex: 1, padding: '10px 15px', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <UploadCloud size={18} /> Upload CSV
                  <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep(3)}>
                <ArrowLeft size={18} style={{ marginRight: '10px' }} /> Back
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setStep(5)}
                disabled={getValidData().length === 0}
                style={{ opacity: getValidData().length === 0 ? 0.5 : 1 }}
              >
                Process Data <ArrowRight size={18} style={{ marginLeft: '10px' }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Visualizing Steps */}
        {step === 5 && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <BarChart2 size={32} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-cyan)' }}>5. Visualization</h3>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Here is what your data looks like when plotted on a graph. The AI uses this scatter plot to find the "line of best fit".
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', height: '350px', marginBottom: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" dataKey="likes" name="Likes" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                  <YAxis type="number" dataKey="comments" name="Comments" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                  <ZAxis range={[60, 60]} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'rgba(10,15,30,0.9)', border: '1px solid var(--accent-cyan)' }} />
                  <Scatter name="Posts" data={getValidData()} fill="var(--accent-cyan)" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)', marginBottom: '30px' }}>
              <strong>Interpretation:</strong> If the dots roughly form a line going upwards from left to right, it means there is a positive correlation (More Likes = More Comments).
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Give your dataset a name (e.g., Viral Posts)" 
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                style={{ 
                  width: '100%', maxWidth: '350px', padding: '12px', borderRadius: '6px', 
                  border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white' 
                }}
              />
              
              <button 
                className="btn-primary" 
                onClick={handleSaveToPredictionEngine}
                disabled={isSaving}
                style={{ width: '100%', maxWidth: '350px' }}
              >
                {isSaving ? 'Saving...' : <><Save size={18} style={{ marginRight: '8px' }} /> Save to Prediction Engine</>}
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--accent-red)', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            {saveSuccess && (
              <div style={{ 
                marginTop: '20px', 
                background: 'rgba(0, 255, 136, 0.1)', 
                border: '1px solid rgba(0, 255, 136, 0.3)', 
                padding: '20px', 
                borderRadius: '8px',
                color: 'var(--accent-green)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <CheckCircle size={24} /> Dataset Saved!
                </h3>
                <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
                  Your dataset <b>&ldquo;{variantName}&rdquo;</b> is ready. Jump straight into the {scenario.title} demonstration and train a model on it.
                </p>
                <button className="btn-primary" onClick={() => onOpenDemonstration?.(scenario)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Train on it in the Demonstration <ArrowRight size={16} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setStep(4)}>
                <ArrowLeft size={18} style={{ marginRight: '10px' }} /> Back to Data Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialMediaDataLab;
