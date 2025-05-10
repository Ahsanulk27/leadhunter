import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, RotateCw, FileCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import axios from 'axios';

interface LeadValidationSummary {
  total: number;
  valid: number;
  suspicious: number;
  invalid: number;
  averageScore: number;
}

interface ValidationField {
  isValid: boolean;
  confidence: number;
}

interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  fields: {
    name: ValidationField;
    phoneNumber: ValidationField;
    email: ValidationField;
    address: ValidationField;
    jobTitle: ValidationField;
  };
  warnings: string[];
  timestamp: string;
  executionId: string;
}

interface Lead {
  id: string;
  name: string;
  jobTitle: string;
  phoneNumber: string;
  email: string;
  address: string;
  [key: string]: any;
}

interface BatchValidationPanelProps {
  leads: Lead[];
  onValidationComplete?: (results: { [id: string]: ValidationResult }, summary: LeadValidationSummary) => void;
}

const BatchValidationPanel: React.FC<BatchValidationPanelProps> = ({ 
  leads, 
  onValidationComplete 
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<LeadValidationSummary | null>(null);
  const [validationResults, setValidationResults] = useState<{ [id: string]: ValidationResult } | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!leads || leads.length === 0) {
      toast({
        title: "No leads to validate",
        description: "Please provide leads for validation",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsValidating(true);
      
      // Send batch validation request to API
      const response = await axios.post('/api/validate/batch', { leads });
      
      if (response.data.success) {
        setExecutionId(response.data.executionId);
        setValidationSummary(response.data.summary);
        setValidationResults(response.data.results);
        
        // Notify parent component if needed
        if (onValidationComplete) {
          onValidationComplete(response.data.results, response.data.summary);
        }
        
        // Show success toast
        toast({
          title: "Batch Validation Complete",
          description: `${response.data.summary.valid} valid, ${response.data.summary.suspicious} suspicious, ${response.data.summary.invalid} invalid leads`,
          variant: response.data.summary.valid > response.data.summary.invalid ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Batch Validation Failed",
          description: response.data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Batch validation error:', error);
      toast({
        title: "Batch Validation Error",
        description: error.message || "An error occurred during batch validation",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Get color for progress bar based on score
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  // Get category count and percentage
  const getCategoryDetails = (category: 'valid' | 'suspicious' | 'invalid') => {
    if (!validationSummary) return { count: 0, percentage: 0 };
    
    const count = validationSummary[category];
    const percentage = Math.round((count / validationSummary.total) * 100);
    
    return { count, percentage };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Batch Data Validation</span>
          {validationSummary && (
            <Badge variant={validationSummary.valid > validationSummary.invalid ? "outline" : "destructive"}>
              {validationSummary.averageScore}% Average Score
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Validate all leads at once to identify data quality issues
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {validationSummary ? (
          <div className="space-y-6">
            {/* Overall score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Average Score</span>
                <span className="text-sm font-medium">{validationSummary.averageScore}%</span>
              </div>
              <Progress 
                value={validationSummary.averageScore} 
                className={getProgressColor(validationSummary.averageScore)}
              />
            </div>

            <Separator />
            
            {/* Validation breakdown */}
            <div className="grid grid-cols-3 gap-4">
              {/* Valid leads */}
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-green-700">Valid Leads</span>
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {getCategoryDetails('valid').count}
                </div>
                <div className="text-sm text-green-600">
                  {getCategoryDetails('valid').percentage}% of total leads
                </div>
              </div>
              
              {/* Suspicious leads */}
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold text-yellow-700">Suspicious Leads</span>
                </div>
                <div className="text-2xl font-bold text-yellow-800">
                  {getCategoryDetails('suspicious').count}
                </div>
                <div className="text-sm text-yellow-600">
                  {getCategoryDetails('suspicious').percentage}% of total leads
                </div>
              </div>
              
              {/* Invalid leads */}
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-red-700">Invalid Leads</span>
                </div>
                <div className="text-2xl font-bold text-red-800">
                  {getCategoryDetails('invalid').count}
                </div>
                <div className="text-sm text-red-600">
                  {getCategoryDetails('invalid').percentage}% of total leads
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Field-specific validation breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Validation by Field Type</h3>
              
              {/* Calculate field-specific stats */}
              {validationResults && (
                <div className="space-y-2">
                  {/* Name field validation */}
                  <FieldValidationStat 
                    fieldName="Name" 
                    results={validationResults} 
                    fieldKey="name" 
                  />
                  
                  {/* Phone field validation */}
                  <FieldValidationStat 
                    fieldName="Phone Number" 
                    results={validationResults} 
                    fieldKey="phoneNumber" 
                  />
                  
                  {/* Email field validation */}
                  <FieldValidationStat 
                    fieldName="Email Address" 
                    results={validationResults} 
                    fieldKey="email" 
                  />
                  
                  {/* Address field validation */}
                  <FieldValidationStat 
                    fieldName="Address" 
                    results={validationResults} 
                    fieldKey="address" 
                  />
                  
                  {/* Job Title field validation */}
                  <FieldValidationStat 
                    fieldName="Job Title" 
                    results={validationResults} 
                    fieldKey="jobTitle" 
                  />
                </div>
              )}
            </div>
            
            {/* Validation recommendations */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
              <h3 className="text-sm font-semibold text-blue-800">Recommendations</h3>
              
              {validationSummary.invalid > 0 && (
                <p className="text-sm text-blue-700">
                  • Review and correct the {validationSummary.invalid} invalid leads before using them for campaigns.
                </p>
              )}
              
              {validationSummary.suspicious > 0 && (
                <p className="text-sm text-blue-700">
                  • Manually verify the {validationSummary.suspicious} suspicious leads for accuracy.
                </p>
              )}
              
              {/* Field-specific recommendations */}
              {validationResults && FieldWithMostIssues(validationResults) && (
                <p className="text-sm text-blue-700">
                  • Focus on improving "{FieldWithMostIssues(validationResults)}" data, which has the most validation issues.
                </p>
              )}
              
              {validationSummary.averageScore < 70 && (
                <p className="text-sm text-blue-700">
                  • Consider refreshing this dataset as the overall quality score is below recommended levels.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-6">
            <div className="text-lg font-medium mb-2">Validate {leads.length} Lead{leads.length !== 1 ? 's' : ''}</div>
            <p className="text-gray-500 mb-6">
              Perform batch validation to check data quality across all leads.
            </p>
            <Button onClick={handleValidate} disabled={isValidating}>
              {isValidating ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Validating {leads.length} leads...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Start Batch Validation
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {validationSummary && (
          <div className="text-xs text-gray-500">
            Batch ID: {executionId} • {new Date().toLocaleString()}
          </div>
        )}
        {validationSummary && (
          <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? (
              <>
                <RotateCw className="mr-2 h-3 w-3 animate-spin" />
                Revalidating...
              </>
            ) : (
              "Revalidate All"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Helper component for field validation statistics
interface FieldValidationStatProps {
  fieldName: string;
  results: { [id: string]: ValidationResult };
  fieldKey: 'name' | 'phoneNumber' | 'email' | 'address' | 'jobTitle';
}

const FieldValidationStat: React.FC<FieldValidationStatProps> = ({ 
  fieldName, 
  results, 
  fieldKey 
}) => {
  // Calculate stats for this field
  const total = Object.keys(results).length;
  const validCount = Object.values(results).filter(
    r => r.fields[fieldKey].isValid
  ).length;
  const percentage = Math.round((validCount / total) * 100);
  
  // Calculate average confidence
  const avgConfidence = Math.round(
    Object.values(results).reduce(
      (sum, r) => sum + r.fields[fieldKey].confidence, 
      0
    ) / total
  );
  
  return (
    <div className="flex items-center space-x-2">
      <div className="w-24 text-sm font-medium truncate">{fieldName}</div>
      <div className="flex-1">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getFieldProgressColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
      <div className="text-xs w-16 text-right">
        {validCount}/{total} valid
      </div>
      <div className="text-xs w-16 text-right">
        {avgConfidence}% score
      </div>
    </div>
  );
};

// Helper function to get color for field progress
function getFieldProgressColor(percentage: number): string {
  if (percentage >= 80) return "bg-green-500";
  if (percentage >= 60) return "bg-yellow-500";
  if (percentage >= 40) return "bg-orange-500";
  return "bg-red-500";
}

// Helper function to find field with most issues
function FieldWithMostIssues(results: { [id: string]: ValidationResult }): string | null {
  const fieldKeys = ['name', 'phoneNumber', 'email', 'address', 'jobTitle'] as const;
  const fieldNames = {
    name: 'Name',
    phoneNumber: 'Phone Number',
    email: 'Email Address',
    address: 'Address',
    jobTitle: 'Job Title'
  };
  
  // Count invalid fields
  const invalidCounts = fieldKeys.map(key => {
    const invalidCount = Object.values(results).filter(
      r => !r.fields[key].isValid
    ).length;
    return { field: key, count: invalidCount };
  });
  
  // Sort by invalid count (descending)
  invalidCounts.sort((a, b) => b.count - a.count);
  
  // Return field with most issues if there are any
  if (invalidCounts.length > 0 && invalidCounts[0].count > 0) {
    return fieldNames[invalidCounts[0].field];
  }
  
  return null;
}

export default BatchValidationPanel;