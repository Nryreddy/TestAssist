"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, getStatusColor } from '@/lib/utils'
import { FileText, Download, Eye } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface RunHistory {
  run_id: string
  filename: string
  status: string
  created_at: string
  completed_at?: string
  test_case_count: number
  llm_provider?: string
  model?: string
}

export function RecentRuns() {
  const [runs, setRuns] = useState<RunHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const data = await api.getRunHistory(5) // Get last 5 runs
        setRuns(data)
      } catch (error) {
        console.error('Failed to fetch recent runs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRuns()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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
    )
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
        <p className="text-muted-foreground mb-4">
          Upload your first requirement document to get started
        </p>
        <Link href="/new">
          <Button>Start Your First Run</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {runs.map((run) => (
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
            <div className="space-y-2">
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
              
              <div className="flex space-x-2 pt-2">
                <Link href={`/runs/${run.run_id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="mr-2 h-3 w-3" />
                    View
                  </Button>
                </Link>
                
                {run.status === 'completed' && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/artifacts/${run.run_id}/testcases.json`} download>
                      <Download className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

