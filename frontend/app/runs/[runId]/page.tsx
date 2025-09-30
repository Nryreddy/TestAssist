"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/header'
import { TestCaseTable } from '@/components/test-case-table'
import { JSONViewer } from '@/components/json-viewer'
import { TraceabilityMatrix } from '@/components/traceability-matrix'
import { formatDate, getStatusColor } from '@/lib/utils'
import { api, RunStatus, TestCase } from '@/lib/api'
import { ArrowLeft, Download, RefreshCw, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function RunDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const runId = params.runId as string
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [traceability, setTraceability] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('table')

  useEffect(() => {
    if (runId) {
      fetchRunData()
    }
  }, [runId])

  const fetchRunData = async () => {
    try {
      setLoading(true)
      
      // Fetch run status
      const status = await api.getRunStatus(runId)
      setRunStatus(status)
      
      // If completed, fetch test cases and traceability
      if (status.status === 'completed') {
        try {
          const jsonBlob = await api.downloadTestCasesJson(runId)
          const jsonText = await jsonBlob.text()
          const cases = JSON.parse(jsonText)
          setTestCases(cases)
          
          // Fetch traceability matrix
          try {
            const traceBlob = await api.downloadTraceabilityMatrix(runId)
            const traceText = await traceBlob.text()
            setTraceability(JSON.parse(traceText))
          } catch (error) {
            console.warn('Could not fetch traceability matrix:', error)
          }
        } catch (error) {
          console.error('Could not fetch test cases:', error)
        }
      }
    } catch (error) {
      toast({
        title: "Failed to load run",
        description: "Could not fetch run details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteRun(runId)
      toast({
        title: "Run deleted",
        description: "The run has been successfully deleted.",
      })
      router.push('/runs')
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete the run. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (format: 'json' | 'csv') => {
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
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the file. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!runStatus) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-xl font-semibold mb-2">Run not found</h2>
              <p className="text-muted-foreground mb-4">
                The requested run could not be found.
              </p>
              <Button onClick={() => router.push('/runs')}>
                Back to Runs
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{
          backgroundImage: "url('/pics/wp3.png')"
        }}
      />
      <div className="relative z-10">
        <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/runs')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {runStatus.filename || 'Run Details'}
                </h1>
                <p className="text-muted-foreground">
                  Run ID: {runId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRunData}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              
              {runStatus.status === 'completed' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload('json')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload('csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Run Status</span>
                <Badge className={getStatusColor(runStatus.status)}>
                  {runStatus.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(runStatus.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(runStatus.updated_at)}</p>
                </div>
                {runStatus.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">{formatDate(runStatus.completed_at)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Test Cases</p>
                  <p className="font-medium">{runStatus.test_case_count}</p>
                </div>
              </div>
              
              {runStatus.error_message && (
                <div className="mt-4 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <h4 className="font-medium text-destructive mb-2">Error</h4>
                  <p className="text-sm text-destructive/80">
                    {runStatus.error_message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {runStatus.status === 'completed' && testCases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Cases</CardTitle>
                <CardDescription>
                  {testCases.length} test cases generated from your requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="table">Table View</TabsTrigger>
                    <TabsTrigger value="json">JSON View</TabsTrigger>
                    <TabsTrigger value="traceability">Traceability</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="table" className="mt-6">
                    <TestCaseTable testCases={testCases} />
                  </TabsContent>
                  
                  <TabsContent value="json" className="mt-6">
                    <JSONViewer data={testCases} />
                  </TabsContent>
                  
                  <TabsContent value="traceability" className="mt-6">
                    <TraceabilityMatrix data={traceability} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {runStatus.status === 'completed' && testCases.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold mb-2">No test cases generated</h3>
                <p className="text-muted-foreground">
                  The run completed but no test cases were generated. This might be due to an error in processing.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      </div>
    </div>
  )
}

