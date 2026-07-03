import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, FileImage, Type, ArrowRight, ArrowLeft, Target, Wrench, Search } from 'lucide-react';
import api from '../../api';
import SocialMediaDataLab from './SocialMediaDataLab';

const LESSONS = {
  REGRESSION: {
    step1: {
      title: "The Blueprint: Feature Weightage",
      icon: <Target size={32} color="var(--accent-cyan)" />,
      text: "We are building a Regression model (predicting a number like a score or a price). Some features matter more than others! For example, when predicting a house's price, the 'Square Footage' carries a LOT of weight, while the 'Color of the Front Door' might carry almost zero weight. When you collect your data, make sure you pick columns that actually matter to the number you want to predict!"
    },
    step2: {
      title: "The Cleanup Crew: Preprocessing",
      icon: <Wrench size={32} color="var(--accent-purple)" />,
      text: "Real-world data is messy! You might have missing numbers or crazy outliers. For a Regression model, we often 'Scale' our numbers so big numbers (like a salary of $100,000) don't bully smaller numbers (like 5 years of experience). We also fill in missing blanks with averages so the AI doesn't get confused."
    }
  },
  CLASSIFICATION: {
    step1: {
      title: "The Blueprint: Feature Weightage",
      icon: <Search size={32} color="var(--accent-cyan)" />,
      text: "We are building a Classification model (sorting things into categories like Spam or Not Spam). The AI looks for strong 'clues' or features. For example, the word 'FREE MONEY' is heavily weighted as Spam. Make sure your data has enough clues for each category!"
    },
    step2: {
      title: "The Cleanup Crew: Preprocessing",
      icon: <Wrench size={32} color="var(--accent-purple)" />,
      text: "To clean data for Classification, we have to make sure our categories are balanced. If you feed the AI 99 pictures of cats and 1 picture of a dog, it will just guess 'Cat' every time! We also have to convert text categories (like 'Red' or 'Blue') into numbers (like 1 or 0) because AI only understands math."
    }
  },
  NEURAL_NETWORK: {
    step1: {
      title: "The Blueprint: Feature Weightage",
      icon: <Target size={32} color="var(--accent-cyan)" />,
      text: "We are building a Neural Network! For images, every single pixel is a 'feature'. The AI's brain looks for patterns of light and dark pixels to find edges and shapes. The 'weight' of a pixel changes as the brain learns which shapes (like curves or straight lines) are most important."
    },
    step2: {
      title: "The Cleanup Crew: Preprocessing",
      icon: <Wrench size={32} color="var(--accent-purple)" />,
      text: "Images are huge! Before feeding an image to our AI, we preprocess it: we resize it down to a small grid (like 8x8 pixels) to save time, convert it to Grayscale (black and white), and 'Normalize' the pixels so their brightness is always a number between 0 and 1."
    }
  },
  COMPUTER_VISION: {
    step1: {
      title: "The Blueprint: Visual Features",
      icon: <Search size={32} color="var(--accent-cyan)" />,
      text: "We are building a Computer Vision model. Instead of numbers in a spreadsheet, the AI looks at pixels! It needs to learn variations. If you want it to recognize handwritten digits, you can't just give it one perfect '5'. You need sloppy 5s, tiny 5s, and tilted 5s so it learns the 'concept' of the shape."
    },
    step2: {
      title: "The Cleanup Crew: Image Processing",
      icon: <Wrench size={32} color="var(--accent-purple)" />,
      text: "Images must be processed before training. We often convert them to grayscale, resize them to a standard grid (like 28x28), and binarize them (pure black and white) to remove background noise. This helps the AI focus purely on the structure."
    }
  }
};

const DataLabCanvas = ({ scenario }) => {
  const [step, setStep] = useState(1); // 1 = Blueprint, 2 = Cleanup, 3 = Upload
  const [files, setFiles] = useState([]); // Support multiple files
  const [variantName, setVariantName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedVariant, setUploadedVariant] = useState(null);

  if (scenario.title === 'The Social Media Trend') {
    return <SocialMediaDataLab scenario={scenario} onBackToDashboard={() => {}} />;
  }

  const lesson = LESSONS[scenario.model_type] || LESSONS.REGRESSION;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // 1. Size check (Max 5MB per file)
      for (const f of selectedFiles) {
        if (f.size > 5 * 1024 * 1024) {
          setError(`File ${f.name} is too large! Maximum allowed size is 5MB per file.`);
          return;
        }
      }

      // 2. Neural Network / CV format check
      if (scenario.model_type === 'NEURAL_NETWORK' || scenario.model_type === 'COMPUTER_VISION') {
        for (const f of selectedFiles) {
          if (!f.type.startsWith('image/')) {
            setError("Computer Vision and Neural Networks expect Image files (PNG/JPG).");
            return;
          }
        }
        setFiles(selectedFiles);
        setError(null);
        setUploadSuccess(false);
        return;
      } else {
        // 3. Regression / Classification check (single file expected)
        const selectedFile = selectedFiles[0];
        if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
          // Pre-check the CSV format and data types
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length < 5) {
              setError("CSV needs more data! Please provide at least 4 rows of data (plus 1 header row).");
              return;
            }
            
            const headers = lines[0].split(',');
            if (headers.length < 2) {
              setError("CSV Format Error: Your data must have at least 2 columns (Features and a Target).");
              return;
            }

            const firstRow = lines[1].split(',');
            if (firstRow.length !== headers.length) {
              setError(`CSV Format Error: Data row 1 has ${firstRow.length} columns, but header has ${headers.length}.`);
              return;
            }

            // All good for CSV
            setFiles([selectedFile]);
            setError(null);
            setUploadSuccess(false);
          };
          reader.readAsText(selectedFile);
          return; // Exit here, state will be updated in reader.onload
        } else if (!selectedFile.type.startsWith('image/') && !selectedFile.name.match(/\.(pdf|txt|md|docx)$/i)) {
           setError("Unsupported file format. Please upload a CSV, Image, PDF, or Text document.");
           return;
        }
        setFiles([selectedFile]);
      }

      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(f => formData.append('file', f));
    formData.append('scenario_id', scenario.id);
    const defaultName = files.length > 1 ? `Custom ${files.length} images` : `Custom ${files[0].name}`;
    formData.append('label', variantName || defaultName);

    try {
      const response = await api.post('/scenarios/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(true);
      setUploadedVariant(response.data);
      setFiles([]);
      setVariantName('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
      {[1, 2, 3].map(i => (
        <React.Fragment key={i}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: step >= i ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
            color: step >= i ? '#000' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '1.2rem',
            boxShadow: step === i ? '0 0 15px var(--accent-cyan)' : 'none'
          }}>
            {i}
          </div>
          {i < 3 && <div style={{ height: '4px', width: '50px', background: step > i ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Data Collection Hub</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '1.1rem', lineHeight: '1.6' }}>
          To build a smart AI, you need good data. "Garbage in, garbage out!" Let's learn how to prep our data for <b>{scenario.title}</b>.
        </p>

        {renderStepIndicator()}

        {/* STEP 1: Feature Weightage */}
        {step === 1 && (
          <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '30px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              {lesson.step1.icon}
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-cyan)' }}>{lesson.step1.title}</h3>
            </div>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: 'var(--text-primary)', marginBottom: '30px' }}>
              {lesson.step1.text}
            </p>
            <div style={{ textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setStep(2)}>
                Next: Data Cleaning <ArrowRight size={18} style={{ marginLeft: '10px' }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Data Cleaning */}
        {step === 2 && (
          <div style={{ background: 'rgba(187, 134, 252, 0.05)', padding: '30px', borderRadius: '12px', border: '1px solid rgba(187, 134, 252, 0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              {lesson.step2.icon}
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-purple)' }}>{lesson.step2.title}</h3>
            </div>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: 'var(--text-primary)', marginBottom: '30px' }}>
              {lesson.step2.text}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={18} style={{ marginRight: '10px' }} /> Back
              </button>
              <button className="btn-primary" onClick={() => setStep(3)}>
                Next: Upload Data <ArrowRight size={18} style={{ marginLeft: '10px' }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: The Upload Mission */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={18} style={{ marginRight: '10px' }} /> Back to Cleanup Crew
              </button>
            </div>

            <div style={{ 
              border: '2px dashed var(--glass-border)', 
              borderRadius: '12px', 
              padding: '40px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              marginBottom: '20px',
              transition: 'border-color 0.3s ease'
            }}>
              <UploadCloud size={48} color="var(--accent-cyan)" style={{ marginBottom: '15px' }} />
              <h3 style={{ margin: '0 0 10px 0' }}>Upload your Custom Dataset</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Remember what you learned! Make sure your data is clean and has the right features. <br/>
                {scenario.model_type === 'NEURAL_NETWORK' ? "Upload an Image (PNG/JPG)." : "Upload a CSV, Image, or Document."}
              </p>
              
              <input 
                type="file" 
                id="file-upload" 
                onChange={handleFileChange} 
                multiple={scenario.model_type === 'COMPUTER_VISION' || scenario.model_type === 'NEURAL_NETWORK'}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                Browse Files
              </label>

              {files.length > 0 && (
                <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '4px' }}>
                      <FileImage size={16} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.9rem' }}>{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '300px' }}>
                  <Type size={18} color="var(--text-secondary)" />
                  <input 
                    type="text" 
                    placeholder="Give this dataset a name..." 
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '6px', 
                      border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' 
                    }}
                  />
                </div>
                
                <button 
                  className="btn-primary" 
                  onClick={handleUpload}
                  disabled={isUploading}
                  style={{ width: '100%', maxWidth: '300px', marginTop: '10px' }}
                >
                  {isUploading ? 'Processing Data...' : 'Add to Collection'}
                </button>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--accent-red)', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            {uploadSuccess && uploadedVariant && (
              <div style={{ 
                marginTop: '30px', 
                background: 'rgba(0, 255, 136, 0.1)', 
                border: '1px solid rgba(0, 255, 136, 0.3)', 
                padding: '20px', 
                borderRadius: '8px',
                color: 'var(--accent-green)'
              }}>
                <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <CheckCircle size={24} /> Data Added to Collection!
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Successfully processed <b>{files.length === 1 ? files[0].name : `${files.length} files`}</b> into structured data.
                </p>
                <p style={{ margin: '10px 0 0 0', color: 'var(--text-primary)' }}>
                  Head over to the <b>Prediction Engine</b> to test your new <b>"{uploadedVariant.variant_name}"</b> dataset!
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default DataLabCanvas;
