import  { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Save, Power, PowerOff } from 'lucide-react';

// Header Editor Component
const HeaderEditor = ({ headers, onChange, title }) => {
  const [headerList, setHeaderList] = useState(Object.entries(headers || {}));

  useEffect(() => {
    setHeaderList(Object.entries(headers || {}));
  }, [headers]);

//   const updateHeaders = () => {
//     const headerObj = headerList.reduce((acc, [key, value]) => {
//       if (key.trim()) acc[key] = value;
//       return acc;
//     }, {});
//     onChange(headerObj);
//   };

  const addHeader = () => {
    const newHeaders : [string, unknown][] = [...headerList, ['', '']];
    setHeaderList(newHeaders);
  };

  const removeHeader = (index) => {
    const newHeaders = headerList.filter((_, i) => i !== index);
    setHeaderList(newHeaders);
    // Update parent immediately
    const headerObj = newHeaders.reduce((acc, [key, value]) => {
      if (key.trim()) acc[key] = value;
      return acc;
    }, {});
    onChange(headerObj);
  };

  const updateHeader = (index, field, value) => {
    const newHeaders = [...headerList];
    newHeaders[index][field === 'key' ? 0 : 1] = value;
    setHeaderList(newHeaders);
    // Update parent immediately
    const headerObj = newHeaders.reduce((acc, [key, val]) => {
      if (key.trim()) acc[key] = val;
      return acc;
    }, {});
    onChange(headerObj);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{title}</label>
        <button
          onClick={addHeader}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        >
          Add Header
        </button>
      </div>
      {headerList.map(([key, value], index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder="Header key"
            value={key}
            onChange={(e) => updateHeader(index, 'key', e.target.value)}
            className="flex-1 px-2 py-1 text-xs border rounded"
          />
          <input
            type="text"
            placeholder="Header value"
            value={value?.toString() || ''}
            onChange={(e) => updateHeader(index, 'value', e.target.value)}
            className="flex-1 px-2 py-1 text-xs border rounded"
          />
          <button
            onClick={() => removeHeader(index)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

// Configuration Section Component
const ConfigurationSection = ({ config, onConfigChange, onSaveConfig }) => {
  return (
    <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Server Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="delayEnabled"
            checked={config.delayEnabled}
            onChange={(e) => onConfigChange({...config, delayEnabled: e.target.checked})}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="delayEnabled" className="text-sm font-medium text-gray-700">
            Enable Global Delay
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Global Delay (ms)
          </label>
          <input
            type="number"
            value={config.delayMs}
            onChange={(e) => onConfigChange({...config, delayMs: parseInt(e.target.value) || 0})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!config.delayEnabled}
            placeholder="0"
            min="0"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="httpsEnabled"
            checked={config.useHttps}
            onChange={(e) => onConfigChange({...config, useHttps: e.target.checked})}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="httpsEnabled" className="text-sm font-medium text-gray-700">
            Enable HTTPS
          </label>
        </div>
        
        <button
          onClick={onSaveConfig}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center justify-center gap-2 transition-colors font-medium"
        >
          <Save size={16} />
          Save Config
        </button>
      </div>
    </div>
  );
};
// Response Section Component
const ResponseSection = ({ rule, index, onUpdateRule, onUploadFile }) => {
  const responseTypes = [
    { value: 'text', label: 'Text' },
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'xml', label: 'XML' },
    { value: 'file', label: 'File Upload' }
  ];

  const getPlaceholderText = () => {
    switch (rule.responseType) {
      case 'json':
        return '{"message": "Hello World", "status": "success"}';
      case 'html':
        return '<html><body><h1>Hello World</h1></body></html>';
      case 'xml':
        return '<?xml version="1.0"?>\n<response>\n  <message>Hello World</message>\n</response>';
      case 'text':
      default:
        return 'Plain text response...';
    }
  };

  // Modified to accept responseType parameter
  const getContentTypeHeader = (responseType) => {
    switch (responseType) {
      case 'json':
        return 'application/json';
      case 'html':
        return 'text/html';
      case 'xml':
        return 'application/xml';
      case 'text':
      default:
        return 'text/plain';
    }
  };

  // Auto-set content-type header when response type changes
  const handleResponseTypeChange = (newType) => {
    onUpdateRule(index, 'responseType', newType);
    
    // Auto-update content-type header using the NEW type
    const currentHeaders = rule.responseHeader || {};
    const newHeaders = {
      ...currentHeaders,
      'Content-Type': getContentTypeHeader(newType) // Pass newType here
    };
    onUpdateRule(index, 'responseHeader', newHeaders);
    
    // Clear response body when switching to file type
    if (newType === 'file') {
      onUpdateRule(index, 'responseBody', '');
    }
  };

  return (
    <div className="mb-4">
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">Response Body Type</label>
        <div className="flex flex-wrap gap-3">
          {responseTypes.map((type) => (
            <label key={type.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`responseType-${index}`}
                value={type.value}
                checked={rule.responseType === type.value}
                onChange={() => handleResponseTypeChange(type.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {rule.responseType === 'file' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Path</label>
            <input
              type="text"
              value={rule.responseFile || ''}
              onChange={(e) => onUpdateRule(index, 'responseFile', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="mocks/path/to/file.jpg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    onUploadFile(index, e.target.files[0]);
                  }
                }}
                className="hidden"
                id={`file-${index}`}
              />
              <label
                htmlFor={`file-${index}`}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer flex items-center gap-2 text-sm transition-colors"
              >
                <Upload size={16} />
                Choose File
              </label>
              <span className="text-sm text-gray-500">
                Any file type supported (images, documents, zip, binary, etc.)
              </span>
            </div>
          </div>
          
          {rule.responseFile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Current file:</strong> {rule.responseFile}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                File will be served as binary response with appropriate headers
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Response Body ({rule.responseType?.toUpperCase() || 'TEXT'})
          </label>
          <textarea
            value={rule.responseBody || ''}
            onChange={(e) => onUpdateRule(index, 'responseBody', e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={rule.responseType === 'json' || rule.responseType === 'html' || rule.responseType === 'xml' ? 6 : 3}
            placeholder={getPlaceholderText()}
          />
          <p className="text-xs text-gray-500 mt-1">
            Content-Type header will be automatically set to: <code>{getContentTypeHeader(rule.responseType)}</code>
          </p>
        </div>
      )}
    </div>
  );
};

// Request Body Section Component
const RequestBodySection = ({ rule, index, onUpdateRule }) => {
  if (!['POST', 'PUT', 'PATCH'].includes(rule.method)) {
    return null;
  }

  const handleRequestBodyChange = (e) => {
    try {
      const json = e.target.value ? JSON.parse(e.target.value) : null;
      onUpdateRule(index, 'requestBody', json);
    } catch (err) {
      console.error('Error parsing JSON:', err);
      // Keep the string for editing - don't update rule with invalid JSON
      // This maintains the current editing state
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Request Body (JSON)</label>
      <textarea
        value={rule.requestBody ? JSON.stringify(rule.requestBody, null, 2) : ''}
        onChange={handleRequestBodyChange}
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
        placeholder='{"key": "value"}'
      />
    </div>
  );
};

// Single Rule Component
const RuleCard = ({ 
  rule, 
  index, 
  httpMethods, 
  onUpdateRule, 
  onToggleRule, 
  onDeleteRule, 
  onUpdateHeaders, 
  onUploadFile 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`border rounded-lg transition-all duration-200 ${
      rule.active 
        ? 'bg-white border-gray-200 shadow-sm' 
        : 'bg-gray-50 border-gray-300 opacity-75'
    }`}>
      {/* Collapsed Header */}
      <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={toggleExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleRule(index);
              }}
              className={`p-1 rounded transition-colors ${
                rule.active 
                  ? 'text-green-500 hover:text-green-600' 
                  : 'text-gray-400 hover:text-gray-500'
              }`}
              title={rule.active ? 'Deactivate rule' : 'Activate rule'}
            >
              {rule.active ? <Power size={16} /> : <PowerOff size={16} />}
            </button>
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`font-medium truncate ${
                rule.active ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {rule.name || 'Unnamed Rule'}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                rule.active 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {rule.method}
              </span>
              <span className={`text-sm truncate ${
                rule.active ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {rule.path}
              </span>
              {rule.responseType === 'file' && (
                <span className={`text-xs px-2 py-1 rounded ${
                  rule.active 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  FILE
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${
              rule.active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {rule.active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRule(index);
              }}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete rule"
            >
              <Trash2 size={14} />
            </button>
            <div className={`transform transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.427 9.573l3.396-3.396a.25.25 0 01.354 0l3.396 3.396a.25.25 0 01-.177.427H4.604a.25.25 0 01-.177-.427z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t bg-white p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
            <input
              type="text"
              placeholder="Enter rule name"
              value={rule.name}
              onChange={(e) => onUpdateRule(index, 'name', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={rule.method}
                onChange={(e) => onUpdateRule(index, 'method', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {httpMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
              <input
                type="text"
                value={rule.path}
                onChange={(e) => onUpdateRule(index, 'path', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/api/endpoint"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Response Code</label>
              <input
                type="number"
                value={rule.responseCode}
                onChange={(e) => onUpdateRule(index, 'responseCode', parseInt(e.target.value) || 200)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Delay Override Section */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Rule-Specific Delay</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`delayOverride-${index}`}
                  checked={rule.delayOverride || false}
                  onChange={(e) => onUpdateRule(index, 'delayOverride', e.target.checked)}
                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor={`delayOverride-${index}`} className="text-sm text-gray-600">
                  Override global delay
                </label>
              </div>
            </div>
            {rule.delayOverride && (
              <div>
                <input
                  type="number"
                  value={rule.delayMs || 0}
                  onChange={(e) => onUpdateRule(index, 'delayMs', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Delay in milliseconds"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This delay will override the global server delay for this specific rule.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <HeaderEditor
              headers={rule.requestHeader}
              onChange={(headers) => onUpdateHeaders(index, 'requestHeader', headers)}
              title="Request Headers"
            />
            <HeaderEditor
              headers={rule.responseHeader}
              onChange={(headers) => onUpdateHeaders(index, 'responseHeader', headers)}
              title="Response Headers"
            />
          </div>

          <ResponseSection
            rule={rule}
            index={index}
            onUpdateRule={onUpdateRule}
            onUploadFile={onUploadFile}
          />

          <RequestBodySection
            rule={rule}
            index={index}
            onUpdateRule={onUpdateRule}
          />
        </div>
      )}
    </div>
  );
};

// Rules Header Component
const RulesHeader = ({ activeCount, onAddRule, onSaveRules }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">Mock Rules ({activeCount} active)</h2>
      <div className="flex gap-2">
        <button
          onClick={onAddRule}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Rule
        </button>
        <button
          onClick={onSaveRules}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2 transition-colors"
        >
          <Save size={16} />
          Save Rules
        </button>
      </div>
    </div>
  );
};

// Main Component
const MockRulesManager = () => {
  const [rules, setRules] = useState([]);
  const [config, setConfig] = useState({
    delayEnabled: false,
    delayMs: 0,
    useHttps: false,
    useSelfSigned: true,
    keyFile: '',
    certFile: ''
  });

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const defaultRule = {
    name: '',
    method: 'GET',
    path: '/',
    requestHeader: {},
    responseBody: '',
    responseFile: '',
    responseHeader: { 'Content-Type': 'text/plain' },
    responseCode: 200,
    requestBody: null,
    active: true,
    responseType: 'text',
    delayOverride: false,
    delayMs: 0
  };

  useEffect(() => {
    loadRules();
    loadConfig();
  }, []);

  const loadRules = async () => {
    try {
      const response = await fetch('/api/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.map(rule => ({ 
          ...rule, 
          active: rule.active !== false, 
          responseType: rule.responseType || (rule.responseFile ? 'file' : 'text'),
          delayOverride: rule.delayOverride || false,
          delayMs: rule.delayMs || 0
        })));
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveRules = async () => {
    try {
      const activeRules = rules.filter(rule => rule.active).map(rule => {
        const {  ...ruleData } = rule;
        
        if (rule.responseType === 'file' && rule.responseFile) {
          ruleData.responseBody = '';
        } else {
          ruleData.responseFile = null;
        }
        
        // Include delay override settings
        if (rule.delayOverride) {
          ruleData.delayOverride = true;
          ruleData.delayMs = rule.delayMs || 0;
        }
        
        return ruleData;
      });

      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeRules)
      });

      if (response.ok) {
        alert('Rules saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save rules:', error);
      alert('Failed to save rules');
    }
  };

  const saveConfig = async () => {
    try {
      const response = await fetch('/apply-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('Configuration saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    }
  };

  const addRule = () => {
    setRules([...rules, { 
      ...defaultRule, 
      name: `Rule ${rules.length + 1}`,
      active: true // Ensure new rules are active by default
    }]);
  };

  const updateRule = (index, field, value) => {
    setRules(prevRules => {
      const newRules = [...prevRules];
      newRules[index] = { ...newRules[index], [field]: value };
      
      // Auto-generate response file path based on endpoint when switching to file type
      if (field === 'responseType' && value === 'file' && !newRules[index].responseFile) {
        const path = newRules[index].path.replace(/^\//, '').replace(/\//g, '/');
        newRules[index].responseFile = `mocks${path}.json`;
      }
      
      return newRules;
    });
  };

  const deleteRule = (index) => {
    setRules(prevRules => prevRules.filter((_, i) => i !== index));
  };

  const toggleRule = (index) => {
    setRules(prevRules => {
      const newRules = [...prevRules];
      newRules[index] = { 
        ...newRules[index], 
        active: !newRules[index].active 
      };
      return newRules;
    });
  };

  const updateHeaders = (index, type, headers) => {
    setRules(prevRules => {
      const newRules = [...prevRules];
      newRules[index] = { ...newRules[index], [type]: headers };
      return newRules;
    });
  };

  const uploadResponseFile = async (index, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', rules[index].responseFile);

    try {
      const response = await fetch('/api/upload-response', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert('File uploaded successfully!');
        // Update the file name in the rule
        const fileName = file.name;
        updateRule(index, 'responseFile', `mocks/${fileName}`);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    }
  };

  const activeRulesCount = rules.filter(r => r.active).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">MockFast - Rule Manager</h1>
          
          <ConfigurationSection
            config={config}
            onConfigChange={setConfig}
            onSaveConfig={saveConfig}
          />

          <RulesHeader
            activeCount={activeRulesCount}
            onAddRule={addRule}
            onSaveRules={saveRules}
          />

          <div className="space-y-4">
            {rules.map((rule, index) => (
              <RuleCard
                key={index}
                rule={rule}
                index={index}
                httpMethods={httpMethods}
                onUpdateRule={updateRule}
                onToggleRule={toggleRule}
                onDeleteRule={deleteRule}
                onUpdateHeaders={updateHeaders}
                onUploadFile={uploadResponseFile}
              />
            ))}
          </div>

          {rules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No rules configured. Click "Add Rule" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockRulesManager;