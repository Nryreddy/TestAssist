import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Zap, Shield, Download } from 'lucide-react'
import { Header } from '@/components/header'
import { RecentRuns } from '@/components/recent-runs'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: "url('/pics/testingwp.jpg')"
        }}
      />
      <div className="relative z-10">
        <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Multi-Agent Test Case Generator
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your requirement documents into comprehensive test cases using AI-powered agents. 
            Upload PDFs, Word docs, or text files and get structured test cases in minutes.
          </p>
          <Link href="/new">
            <Button size="lg" className="text-lg px-8 py-6">
              <FileText className="mr-2 h-5 w-5" />
              Upload Requirements
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Multi-Format Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload PDF, Word (.docx), or plain text files. Our system extracts and processes content automatically.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI-Powered Agents</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Multi-agent workflow analyzes requirements, generates test cases, validates output, and ensures coverage.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Comprehensive Coverage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate positive, negative, edge, and security test cases with automatic coverage auditing.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Multiple Formats</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Export test cases as JSON or CSV with requirement traceability matrices for easy integration.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Recent Runs */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Runs</h2>
          <RecentRuns />
        </div>

        {/* How It Works */}
        <div className="bg-muted/50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Upload Documents</h3>
              <p className="text-sm text-muted-foreground">
                Upload your requirement documents in PDF, Word, or text format.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">AI Processing</h3>
              <p className="text-sm text-muted-foreground">
                Our multi-agent system analyzes requirements and generates comprehensive test cases.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Download Results</h3>
              <p className="text-sm text-muted-foreground">
                Get structured test cases in JSON or CSV format with traceability matrices.
              </p>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

