"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react'
import { api, RunStatus } from '@/lib/api'

interface RunStepperProps {
  runId: string
}

const steps = [
  { id: 'uploading', label: 'Upload', description: 'Uploading files' },
  { id: 'reading', label: 'Read', description: 'Extracting text content' },
  { id: 'analyzing', label: 'Analyze', description: 'Analyzing requirements' },
  { id: 'generating', label: 'Generate', description: 'Generating test cases' },
  { id: 'validating', label: 'Validate', description: 'Validating output' },
  { id: 'auditing', label: 'Audit', description: 'Checking coverage' },
  { id: 'exporting', label: 'Export', description: 'Creating artifacts' },
  { id: 'completed', label: 'Complete', description: 'Generation finished' },
]

export function RunStepper({ runId }: RunStepperProps) {
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
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-6 w-6 bg-muted rounded-full"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!runStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load run status
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStepIndex = (status: string) => {
    const stepMap: Record<string, number> = {
      'pending': 0,
      'uploading': 0,
      'reading': 1,
      'analyzing': 2,
      'generating': 3,
      'validating': 4,
      'auditing': 5,
      'exporting': 6,
      'completed': 7,
      'failed': -1,
    }
    return stepMap[status] ?? 0
  }

  const currentStepIndex = getStepIndex(runStatus.status)
  const isFailed = runStatus.status === 'failed'

  const getStepIcon = (stepIndex: number) => {
    if (isFailed && stepIndex === currentStepIndex) {
      return <AlertCircle className="h-5 w-5 text-destructive" />
    }
    
    if (stepIndex < currentStepIndex || runStatus.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    
    if (stepIndex === currentStepIndex) {
      return <Clock className="h-5 w-5 text-primary animate-pulse" />
    }
    
    return <Circle className="h-5 w-5 text-muted-foreground" />
  }

  const getStepStatus = (stepIndex: number) => {
    if (isFailed && stepIndex === currentStepIndex) {
      return 'failed'
    }
    
    if (stepIndex < currentStepIndex || runStatus.status === 'completed') {
      return 'completed'
    }
    
    if (stepIndex === currentStepIndex) {
      return 'active'
    }
    
    return 'pending'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Processing Steps</h3>
            <Badge variant={isFailed ? 'destructive' : 'default'}>
              {runStatus.status}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {steps.map((step, index) => {
              const status = getStepStatus(index)
              const isActive = status === 'active'
              const isCompleted = status === 'completed'
              const isFailed = status === 'failed'
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    isActive ? 'bg-primary/5 border border-primary/20' : ''
                  }`}
                >
                  {getStepIcon(index)}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${
                        isActive ? 'text-primary' : 
                        isCompleted ? 'text-green-600' :
                        isFailed ? 'text-destructive' :
                        'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                      {isActive && runStatus.current_node && (
                        <Badge variant="outline" className="text-xs">
                          {runStatus.current_node}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  
                  {isActive && runStatus.progress_percentage > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {runStatus.progress_percentage}%
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {runStatus.error_message && (
            <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">Error</h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    {runStatus.error_message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

