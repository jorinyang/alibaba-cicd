import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h1>🚀 React部署成功！</h1>
        <span style={{
          display: 'inline-block',
          background: '#00d4aa',
          color: '#1a1a2e',
          padding: '5px 15px',
          borderRadius: '20px',
          fontSize: '0.9em',
          fontWeight: 'bold'
        }}>React SPA</span>
        
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '20px',
          borderRadius: '10px',
          margin: '20px 0'
        }}>
          <h2>项目信息</h2>
          <p><strong>类型:</strong> React单页应用</p>
          <p><strong>部署平台:</strong> 阿里云OSS</p>
          <p><strong>构建工具:</strong> Create React App</p>
        </div>
        
        <p>这是你的React自动部署项目！</p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
