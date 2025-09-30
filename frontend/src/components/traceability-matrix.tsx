"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getPriorityColor, getTypeColor } from '@/lib/utils'

interface TraceabilityMatrixProps {
  data: any
}

export function TraceabilityMatrix({ data }: TraceabilityMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  if (!data || Object.keys(data).length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No traceability data</h3>
              <p className="text-muted-foreground">
                No requirement traceability matrix was generated for this run.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const requirements = Object.keys(data)
  const filteredRequirements = requirements.filter(reqId =>
    reqId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const copyToClipboard = async () => {
    try {
      const csvContent = generateCSV()
      await navigator.clipboard.writeText(csvContent)
      toast({
        title: "Copied to clipboard",
        description: "Traceability matrix has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadCSV = () => {
    const csvContent = generateCSV()
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'traceability-matrix.csv'
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    toast({
      title: "Download started",
      description: "Traceability matrix CSV is being downloaded.",
    })
  }

  const generateCSV = () => {
    const headers = ['Requirement ID', 'Test Case ID', 'Test Case Title', 'Type', 'Priority']
    const rows = [headers.join(',')]
    
    filteredRequirements.forEach(reqId => {
      const testCases = data[reqId] || []
      testCases.forEach((testCase: any) => {
        const row = [
          reqId,
          testCase.test_case_id,
          `"${testCase.title}"`,
          testCase.type,
          testCase.priority
        ]
        rows.push(row.join(','))
      })
    })
    
    return rows.join('\n')
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Badge variant="outline">
            {filteredRequirements.length} requirement{filteredRequirements.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copy CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Matrix */}
      <div className="space-y-4">
        {filteredRequirements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No requirements found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search term
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRequirements.map(reqId => {
            const testCases = data[reqId] || []
            
            return (
              <Card key={reqId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{reqId}</span>
                    <Badge variant="outline">
                      {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testCases.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No test cases linked to this requirement
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {testCases.map((testCase: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/25"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-mono text-sm font-medium">
                                {testCase.test_case_id}
                              </span>
                              <Badge className={getTypeColor(testCase.type)}>
                                {testCase.type}
                              </Badge>
                              <Badge className={getPriorityColor(testCase.priority)}>
                                {testCase.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {testCase.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Summary */}
      {filteredRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {filteredRequirements.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Requirements
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {filteredRequirements.reduce((total, reqId) => total + (data[reqId]?.length || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Test Cases
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {filteredRequirements.filter(reqId => (data[reqId]?.length || 0) > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Covered Requirements
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

