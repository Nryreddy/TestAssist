"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, ChevronRight, Search, Filter } from 'lucide-react'
import { TestCase } from '@/lib/api'
import { getPriorityColor, getTypeColor } from '@/lib/utils'

interface TestCaseTableProps {
  testCases: TestCase[]
}

export function TestCaseTable({ testCases }: TestCaseTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'id' | 'priority' | 'type'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const filteredAndSortedCases = testCases
    .filter(case_ => {
      const matchesSearch = 
        case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.requirement_ids.some(id => id.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesPriority = priorityFilter === 'all' || case_.priority === priorityFilter
      const matchesType = typeFilter === 'all' || case_.type === typeFilter
      
      return matchesSearch && matchesPriority && matchesType
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
        case 'priority':
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleSort = (column: 'id' | 'priority' | 'type') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Functional">Functional</SelectItem>
              <SelectItem value="Negative">Negative</SelectItem>
              <SelectItem value="Edge">Edge</SelectItem>
              <SelectItem value="Security">Security</SelectItem>
              <SelectItem value="Performance">Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedCases.length} of {testCases.length} test cases
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">Title</th>
                <th className="text-left p-4 font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('priority')}
                    className="h-auto p-0 font-medium"
                  >
                    Priority
                    {sortBy === 'priority' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Button>
                </th>
                <th className="text-left p-4 font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('type')}
                    className="h-auto p-0 font-medium"
                  >
                    Type
                    {sortBy === 'type' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Button>
                </th>
                <th className="text-left p-4 font-medium">Requirements</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCases.map((testCase) => {
                const isExpanded = expandedRows.has(testCase.id)
                
                return (
                  <>
                    <tr key={testCase.id} className="border-t hover:bg-muted/25">
                      <td className="p-4 font-mono text-sm">{testCase.id}</td>
                      <td className="p-4">
                        <div className="max-w-xs truncate" title={testCase.title}>
                          {testCase.title}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getPriorityColor(testCase.priority)}>
                          {testCase.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getTypeColor(testCase.type)}>
                          {testCase.type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {testCase.requirement_ids.slice(0, 2).map((reqId) => (
                            <Badge key={reqId} variant="outline" className="text-xs">
                              {reqId}
                            </Badge>
                          ))}
                          {testCase.requirement_ids.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{testCase.requirement_ids.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(testCase.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="border-t bg-muted/10">
                        <td colSpan={6} className="p-4">
                          <div className="space-y-4">
                            {/* Preconditions */}
                            {testCase.preconditions.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Preconditions:</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {testCase.preconditions.map((precondition, index) => (
                                    <li key={index}>{precondition}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Steps */}
                            <div>
                              <h4 className="font-medium mb-2">Test Steps:</h4>
                              <ol className="list-decimal list-inside space-y-1 text-sm">
                                {testCase.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                            </div>
                            
                            {/* Expected Result */}
                            <div>
                              <h4 className="font-medium mb-2">Expected Result:</h4>
                              <p className="text-sm text-muted-foreground">
                                {testCase.expected_result}
                              </p>
                            </div>
                            
                            {/* All Requirements */}
                            {testCase.requirement_ids.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Related Requirements:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {testCase.requirement_ids.map((reqId) => (
                                    <Badge key={reqId} variant="outline" className="text-xs">
                                      {reqId}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedCases.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No test cases found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

