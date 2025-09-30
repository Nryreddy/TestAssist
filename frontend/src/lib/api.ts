import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 360000, // 360 seconds
})

export interface IngestRequest {
  llm_provider: string
  model: string
  max_cases: number
  repair_attempts: number
  enable_coverage_auditor: boolean
}

export interface IngestResponse {
  run_id: string
  message: string
}

export interface RunStatus {
  run_id: string
  status: string
  current_node?: string
  progress_percentage: number
  created_at: string
  updated_at: string
  completed_at?: string
  test_case_count: number
  error_message?: string
  filename?: string
}

export interface GenerateRequest {
  force_restart: boolean
}

export interface GenerateResponse {
  run_id: string
  status: string
  message: string
}

export interface RunHistory {
  run_id: string
  filename: string
  status: string
  created_at: string
  completed_at?: string
  test_case_count: number
  llm_provider?: string
  model?: string
}

export interface TestCase {
  id: string
  title: string
  requirement_ids: string[]
  preconditions: string[]
  steps: string[]
  expected_result: string
  priority: 'High' | 'Medium' | 'Low'
  type: 'Functional' | 'Negative' | 'Edge' | 'Security' | 'Performance'
}

export const api = {
  async ingestDocuments(
    files: File[],
    options: Partial<IngestRequest> = {}
  ): Promise<IngestResponse> {
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append('files', file)
    })
    
    // Add options as form data
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value.toString())
    })
    
    const response = await apiClient.post<IngestResponse>('/api/v1/ingest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },

  async getRunStatus(runId: string): Promise<RunStatus> {
    const response = await apiClient.get<RunStatus>(`/api/v1/status/${runId}`)
    return response.data
  },

  async generateTestCases(
    runId: string,
    request: GenerateRequest = { force_restart: false }
  ): Promise<GenerateResponse> {
    const response = await apiClient.post<GenerateResponse>(
      `/api/v1/generate/${runId}`,
      request
    )
    return response.data
  },

  async getRunHistory(limit: number = 50): Promise<RunHistory[]> {
    const response = await apiClient.get<RunHistory[]>(`/api/v1/history?limit=${limit}`)
    return response.data
  },

  async downloadTestCasesJson(runId: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/artifacts/${runId}/testcases.json`, {
      responseType: 'blob',
    })
    return response.data
  },

  async downloadTestCasesCsv(runId: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/artifacts/${runId}/testcases.csv`, {
      responseType: 'blob',
    })
    return response.data
  },

  async downloadTraceabilityMatrix(runId: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/artifacts/${runId}/traceability.json`, {
      responseType: 'blob',
    })
    return response.data
  },

  async deleteRun(runId: string): Promise<void> {
    await apiClient.delete(`/api/v1/runs/${runId}`)
  },

  async healthCheck(): Promise<any> {
    const response = await apiClient.get('/health')
    return response.data
  },
}

export default api
