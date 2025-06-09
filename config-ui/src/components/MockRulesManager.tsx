import  { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Save, Power, PowerOff } from 'lucide-react';

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
    responseHeader: {},
    responseCode: 200,
    requestBody: null,
    active: true,
    useFile: false
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
        setRules(data.map(rule => ({ ...rule, active: rule.active !== false, useFile: !!rule.responseFile })));
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
        const { active, useFile, ...ruleData } = rule;
        if (useFile && rule.responseFile) {
          ruleData.responseBody = '';
        } else {
          ruleData.responseFile = null;
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
    setRules([...rules, { ...defaultRule, name: `Rule ${rules.length + 1}` }]);
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    
    // Auto-generate response file path based on endpoint
    if (field === 'path' && newRules[index].useFile) {
      const path = value.replace(/^\//, '').replace(/\//g, '/');
      newRules[index].responseFile = `mocks${path}.json`;
    }
    
    setRules(newRules);
  };

  const deleteRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const toggleRule = (index) => {
    const newRules = [...rules];
    newRules[index].active = !newRules[index].active;
    setRules(newRules);
  };

  const updateHeaders = (index, type, headers) => {
    const newRules = [...rules];
    newRules[index][type] = headers;
    setRules(newRules);
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
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    }
  };

  const HeaderEditor = ({ headers, onChange, title }) => {
    const [headerList, setHeaderList] = useState(Object.entries(headers || {}));

    const updateHeaders = () => {
      const headerObj = headerList.reduce((acc, [key, value]) => {
        if (key.trim()) acc[key] = value;
        return acc;
      }, {});
      onChange(headerObj);
    };

    const addHeader = () => {
      setHeaderList([...headerList, ['', '']]);
    };

    const removeHeader = (index) => {
      const newHeaders = headerList.filter((_, i) => i !== index);
      setHeaderList(newHeaders);
      setTimeout(updateHeaders, 0);
    };

    const updateHeader = (index, field, value) => {
      const newHeaders = [...headerList];
      newHeaders[index][field === 'key' ? 0 : 1] = value;
      setHeaderList(newHeaders);
      setTimeout(updateHeaders, 0);
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
              value={value.toString()}
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">MockFast - Rule Manager</h1>
          
          {/* Configuration Section */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Server Configuration</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.delayEnabled}
                  onChange={(e) => setConfig({...config, delayEnabled: e.target.checked})}
                />
                <span className="text-sm">Enable Delay</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay (ms)</label>
                <input
                  type="number"
                  value={config.delayMs}
                  onChange={(e) => setConfig({...config, delayMs: parseInt(e.target.value) || 0})}
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!config.delayEnabled}
                />
              </div>
              <button
                onClick={saveConfig}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
              >
                <Save size={16} />
                Save Config
              </button>
            </div>
          </div>

          {/* Rules Section */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Mock Rules ({rules.filter(r => r.active).length} active)</h2>
            <div className="flex gap-2">
              <button
                onClick={addRule}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Rule
              </button>
              <button
                onClick={saveRules}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
              >
                <Save size={16} />
                Save Rules
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={index} className={`border rounded-lg p-4 ${rule.active ? 'bg-white' : 'bg-gray-100 opacity-75'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(index)}
                      className={`p-1 rounded ${rule.active ? 'text-green-500' : 'text-gray-400'}`}
                    >
                      {rule.active ? <Power size={16} /> : <PowerOff size={16} />}
                    </button>
                    <input
                      type="text"
                      placeholder="Rule name"
                      value={rule.name}
                      onChange={(e) => updateRule(index, 'name', e.target.value)}
                      className="font-medium text-lg border-none outline-none bg-transparent"
                    />
                  </div>
                  <button
                    onClick={() => deleteRule(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={rule.method}
                      onChange={(e) => updateRule(index, 'method', e.target.value)}
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
                      onChange={(e) => updateRule(index, 'path', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="/api/endpoint"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Response Code</label>
                    <input
                      type="number"
                      value={rule.responseCode}
                      onChange={(e) => updateRule(index, 'responseCode', parseInt(e.target.value) || 200)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <HeaderEditor
                    headers={rule.requestHeader}
                    onChange={(headers) => updateHeaders(index, 'requestHeader', headers)}
                    title="Request Headers"
                  />
                  <HeaderEditor
                    headers={rule.responseHeader}
                    onChange={(headers) => updateHeaders(index, 'responseHeader', headers)}
                    title="Response Headers"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="text-sm font-medium text-gray-700">Response Type:</label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`responseType-${index}`}
                        checked={!rule.useFile}
                        onChange={() => updateRule(index, 'useFile', false)}
                      />
                      <span className="text-sm">Response Body</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`responseType-${index}`}
                        checked={rule.useFile}
                        onChange={() => updateRule(index, 'useFile', true)}
                      />
                      <span className="text-sm">Response File</span>
                    </label>
                  </div>

                  {rule.useFile ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={rule.responseFile}
                        onChange={(e) => updateRule(index, 'responseFile', e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="mocks/path/to/response.json"
                      />
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept=".json,.html,.htm,.txt"
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              uploadResponseFile(index, e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          id={`file-${index}`}
                        />
                        <label
                          htmlFor={`file-${index}`}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 cursor-pointer flex items-center gap-1 text-sm"
                        >
                          <Upload size={14} />
                          Upload File
                        </label>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={rule.responseBody}
                      onChange={(e) => updateRule(index, 'responseBody', e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Response body content..."
                    />
                  )}
                </div>

                {(rule.method === 'POST' || rule.method === 'PUT' || rule.method === 'PATCH') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Body (JSON)</label>
                    <textarea
                      value={rule.requestBody ? JSON.stringify(rule.requestBody, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          const json = e.target.value ? JSON.parse(e.target.value) : null;
                          updateRule(index, 'requestBody', json);
                        } catch (err) {
                          // Invalid JSON, keep the string for editing
                        }
                      }}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder='{"key": "value"}'
                    />
                  </div>
                )}
              </div>
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