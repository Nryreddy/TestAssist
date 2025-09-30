"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/header'
import { FileDropZone } from '@/components/file-drop-zone'
import { RunStepper } from '@/components/run-stepper'
import { LiveStatusCard } from '@/components/live-status-card'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { Upload, Settings, Play, Download } from 'lucide-react'

export default function NewRunPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // File upload state
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  
  // Configuration state
  const [llmProvider, setLlmProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o-mini-2024-07-18')
  const [maxCases, setMaxCases] = useState(10)
  const [repairAttempts, setRepairAttempts] = useState(1)
  const [enableCoverageAuditor, setEnableCoverageAuditor] = useState(true)
  
  // Run state
  const [runId, setRunId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFileUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    
    try {
      const response = await api.ingestDocuments(files, {
        llm_provider: llmProvider,
        model: model,
        max_cases: maxCases,
        repair_attempts: repairAttempts,
        enable_coverage_auditor: enableCoverageAuditor,
      })
      
      setRunId(response.run_id)
      
      toast({
        title: "Files uploaded successfully",
        description: response.message,
      })
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.response?.data?.detail || error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleGenerate = async () => {
    if (!runId) return
    
    setGenerating(true)
    
    try {
      const response = await api.generateTestCases(runId, { force_restart: false })
      
      toast({
        title: "Generation started",
        description: response.message,
      })
      
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.response?.data?.detail || error.message,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (format: 'json' | 'csv') => {
    if (!runId) return
    
    try {
      const blob = format === 'json' 
        ? await api.downloadTestCasesJson(runId)
        : await api.downloadTestCasesCsv(runId)
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `testcases_${runId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Download started",
        description: `Test cases downloaded as ${format.toUpperCase()}`,
      })
      
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.response?.data?.detail || error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{
          backgroundImage: "url('/pics/wp2.png')"
        }}
      />
      <div className="relative z-10">
        <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Generate Test Cases
            </h1>
            <p className="text-muted-foreground">
              Upload your requirement documents and configure the AI agents to generate comprehensive test cases
            </p>
          </div>

          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Upload Requirements
              </CardTitle>
              <CardDescription>
                Upload PDF, Word (.docx), or text files containing your requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropZone
                files={files}
                onFilesChange={setFiles}
                disabled={uploading || !!runId}
              />
              
              {files.length > 0 && (
                <div className="mt-4">
                  <Button 
                    onClick={handleFileUpload}
                    disabled={uploading || !!runId}
                    className="w-full"
                  >
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Configuration
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </Button>
              </CardTitle>
              <CardDescription>
                Configure the AI agents and generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Configuration */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="llm-provider">LLM Provider</Label>
                  <Select value={llmProvider} onValueChange={setLlmProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini-2024-07-18">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-cases">Maximum Test Cases</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="max-cases"
                    type="number"
                    min="1"
                    max="100"
                    value={maxCases}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setMaxCases(Math.max(1, Math.min(100, value)));
                    }}
                    className="w-24"
                  />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={maxCases}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setMaxCases(Math.max(1, Math.min(100, value)));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Configuration */}
              {showAdvanced && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="repair-attempts">JSON Repair Attempts</Label>
                    <Input
                      id="repair-attempts"
                      type="number"
                      min="0"
                      max="3"
                      value={repairAttempts}
                      onChange={(e) => setRepairAttempts(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="coverage-auditor">Enable Coverage Auditor</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically identify and fill coverage gaps
                      </p>
                    </div>
                    <Switch
                      id="coverage-auditor"
                      checked={enableCoverageAuditor}
                      onCheckedChange={setEnableCoverageAuditor}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation Section */}
          {runId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="mr-2 h-5 w-5" />
                  Generate Test Cases
                </CardTitle>
                <CardDescription>
                  Run ID: <Badge variant="outline">{runId}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RunStepper runId={runId} />
                
                <LiveStatusCard runId={runId} />
                
                <div className="flex space-x-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1"
                  >
                    {generating ? 'Generating...' : 'Start Generation'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('json')}
                    disabled={generating}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('csv')}
                    disabled={generating}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      </div>
    </div>
  )
}
