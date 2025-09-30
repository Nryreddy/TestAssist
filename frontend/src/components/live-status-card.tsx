"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { api, RunStatus } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface LiveStatusCardProps {
  runId: string
}

export function LiveStatusCard({ runId }: LiveStatusCardProps) {
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await api.getRunStatus(runId)
        setRunStatus(status)
      } catch (error) {
        console.error('Failed to fetch run status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    
    // Poll for status updates every 2 seconds
    const interval = setInterval(fetchStatus, 2000)
    
    return () => clearInterval(interval)
  }, [runId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Live Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!runStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Live Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Failed to load run status
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (runStatus.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return <Clock className="h-5 w-5 text-primary animate-pulse" />
    }
  }

  const getStatusColor = () => {
    switch (runStatus.status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
      case 'failed':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
      default:
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
    }
  }

  const isProcessing = !['completed', 'failed'].includes(runStatus.status)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Live Status
          </div>
          <Badge className={getStatusColor()}>
            {runStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{runStatus.progress_percentage}%</span>
            </div>
            <Progress value={runStatus.progress_percentage} className="h-2" />
          </div>
        )}

        {/* Current Node */}
        {runStatus.current_node && (
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm">
              Currently: <span className="font-medium">{runStatus.current_node}</span>
            </span>
          </div>
        )}

        {/* Test Case Count */}
        {runStatus.test_case_count > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Test Cases Generated</span>
            <Badge variant="outline">{runStatus.test_case_count}</Badge>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Started:</span>
            <span>{formatDate(runStatus.created_at)}</span>
          </div>
          
          {runStatus.completed_at && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{formatDate(runStatus.completed_at)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Last Updated:</span>
            <span>{formatDate(runStatus.updated_at)}</span>
          </div>
        </div>

        {/* Error Message */}
        {runStatus.error_message && (
          <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-destructive">Error Details</h4>
                <p className="text-xs text-destructive/80 mt-1">
                  {runStatus.error_message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filename */}
        {runStatus.filename && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">File:</span> {runStatus.filename}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

