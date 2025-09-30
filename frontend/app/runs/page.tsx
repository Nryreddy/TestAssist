"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/header'
import { formatDate, getStatusColor } from '@/lib/utils'
import { api, RunHistory } from '@/lib/api'
import { Search, Filter, Download, Eye, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function RunsPage() {
  const { toast } = useToast()
  const [runs, setRuns] = useState<RunHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')

  useEffect(() => {
    fetchRuns()
  }, [])

  const fetchRuns = async () => {
    try {
      setLoading(true)
      const data = await api.getRunHistory(100) // Get more runs for history page
      setRuns(data)
    } catch (error) {
      toast({
        title: "Failed to load runs",
        description: "Could not fetch run history. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteRun(runId)
      setRuns(runs.filter(run => run.run_id !== runId))
      toast({
        title: "Run deleted",
        description: "The run has been successfully deleted.",
      })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete the run. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (runId: string, format: 'json' | 'csv') => {
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

  // Filter and sort runs
  const filteredRuns = runs
    .filter(run => {
      const matchesSearch = run.filename.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'filename':
          return a.filename.localeCompare(b.filename)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'test_case_count':
          return b.test_case_count - a.test_case_count
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Run History</h1>
              <p className="text-muted-foreground">
                View and manage your test case generation runs
              </p>
            </div>
            <Button onClick={fetchRuns} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by filename..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="generating">Generating</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date</SelectItem>
                      <SelectItem value="filename">Filename</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="test_case_count">Test Cases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Runs Grid */}
          {filteredRuns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No runs found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'Start by uploading your first requirement document'
                      }
                    </p>
                  </div>
                  {!searchTerm && statusFilter === 'all' && (
                    <Link href="/new">
                      <Button>Create New Run</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRuns.map((run) => (
                <Card key={run.run_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <CardTitle 
                          className="text-base truncate" 
                          title={run.filename}
                        >
                          {run.filename}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatDate(run.created_at)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Test Cases:</span>
                        <span className="font-medium">{run.test_case_count}</span>
                      </div>
                      
                      {run.llm_provider && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Model:</span>
                          <span className="font-medium">{run.model}</span>
                        </div>
                      )}
                      
                      {run.completed_at && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-medium">{formatDate(run.completed_at)}</span>
                        </div>
                      )}
                      
                      <div className="flex space-x-2 pt-2">
                        <Link href={`/runs/${run.run_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="mr-2 h-3 w-3" />
                            View
                          </Button>
                        </Link>
                        
                        {run.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(run.run_id, 'json')}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(run.run_id, 'csv')}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(run.run_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  )
}

