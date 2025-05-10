import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Phone, Mail, User, Briefcase, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RotateCw } from 'lucide-react';
import axios from 'axios';

interface ValidationField {
  isValid: boolean;
  confidence: number;
  suggestion?: string;
  formatted?: string;
  standardized?: string;
  lineType?: string;
  isDisposable?: boolean;
  components?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
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

interface DataValidationPanelProps {
  lead: Lead;
  onValidationComplete?: (result: ValidationResult) => void;
  initialValidationResult?: ValidationResult;
}

const DataValidationPanel: React.FC<DataValidationPanelProps> = ({ 
  lead, 
  onValidationComplete,
  initialValidationResult
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(initialValidationResult || null);
  const { toast } = useToast();

  const handleValidate = async () => {
    try {
      setIsValidating(true);
      
      // Send validation request to API
      const response = await axios.post('/api/validate/lead', lead);
      
      if (response.data.success) {
        setValidationResult(response.data.validation);
        
        // Notify parent component if needed
        if (onValidationComplete) {
          onValidationComplete(response.data.validation);
        }
        
        // Show success toast
        toast({
          title: "Validation Complete",
          description: `Overall confidence score: ${response.data.validation.confidenceScore}%`,
          variant: response.data.validation.isValid ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Validation Failed",
          description: response.data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Error",
        description: error.message || "An error occurred during validation",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Get validation status icon
  const getStatusIcon = (isValid: boolean, confidence: number) => {
    if (isValid && confidence >= 80) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (isValid || confidence >= 50) {
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // Get validation status text
  const getStatusText = (isValid: boolean, confidence: number) => {
    if (isValid && confidence >= 80) {
      return "Verified";
    } else if (isValid || confidence >= 50) {
      return "Needs Review";
    } else {
      return "Invalid";
    }
  };

  // Get status color for confidence score
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Validation</span>
          <Badge variant={validationResult?.isValid ? "outline" : "destructive"}>
            {validationResult ? (validationResult.isValid ? "Valid Data" : "Data Issues Found") : "Not Validated"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Verify the quality and accuracy of this lead's data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {validationResult ? (
          <div className="space-y-4">
            {/* Overall score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Confidence Score</span>
                <span className="text-sm font-medium">{validationResult.confidenceScore}%</span>
              </div>
              <Progress 
                value={validationResult.confidenceScore} 
                className={getConfidenceColor(validationResult.confidenceScore)}
              />
            </div>

            <Separator />
            
            {/* Warnings summary */}
            {validationResult.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-1">
                <div className="flex items-center space-x-2 text-amber-800 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>Warnings</span>
                </div>
                <ul className="text-sm space-y-1 pl-6 text-amber-700">
                  {validationResult.warnings.map((warning, idx) => (
                    <li key={idx} className="list-disc">{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Field validations */}
            <Tabs defaultValue="name" className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="name" className="flex items-center justify-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>Name</span>
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center justify-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>Phone</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center justify-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </TabsTrigger>
                <TabsTrigger value="address" className="flex items-center justify-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>Address</span>
                </TabsTrigger>
                <TabsTrigger value="job" className="flex items-center justify-center space-x-1">
                  <Briefcase className="w-4 h-4" />
                  <span>Job</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Name Tab */}
              <TabsContent value="name" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(validationResult.fields.name.isValid, validationResult.fields.name.confidence)}
                    <span className="font-medium">{getStatusText(validationResult.fields.name.isValid, validationResult.fields.name.confidence)}</span>
                  </div>
                  <div className="text-sm">Confidence: {validationResult.fields.name.confidence}%</div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-1">Name</div>
                  <div className="text-base">{lead.name}</div>
                </div>

                {validationResult.fields.name.suggestion && (
                  <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                    <div className="text-sm font-medium mb-1 text-blue-800">Suggestion</div>
                    <div className="text-base text-blue-900">{validationResult.fields.name.suggestion}</div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {validationResult.fields.name.isValid 
                    ? "This name appears to be valid." 
                    : "This name may not be valid or accurate."}
                </div>
              </TabsContent>

              {/* Phone Tab */}
              <TabsContent value="phone" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(validationResult.fields.phoneNumber.isValid, validationResult.fields.phoneNumber.confidence)}
                    <span className="font-medium">{getStatusText(validationResult.fields.phoneNumber.isValid, validationResult.fields.phoneNumber.confidence)}</span>
                  </div>
                  <div className="text-sm">Confidence: {validationResult.fields.phoneNumber.confidence}%</div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-1">Phone Number</div>
                  <div className="text-base">{lead.phoneNumber}</div>
                </div>

                {validationResult.fields.phoneNumber.formatted && validationResult.fields.phoneNumber.formatted !== lead.phoneNumber && (
                  <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                    <div className="text-sm font-medium mb-1 text-blue-800">Formatted Number</div>
                    <div className="text-base text-blue-900">{validationResult.fields.phoneNumber.formatted}</div>
                  </div>
                )}

                {validationResult.fields.phoneNumber.lineType && (
                  <div className="flex space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {validationResult.fields.phoneNumber.lineType.toUpperCase()}
                    </Badge>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {validationResult.fields.phoneNumber.isValid 
                    ? "This phone number appears to be valid." 
                    : "This phone number may not be valid or accurate."}
                </div>
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(validationResult.fields.email.isValid, validationResult.fields.email.confidence)}
                    <span className="font-medium">{getStatusText(validationResult.fields.email.isValid, validationResult.fields.email.confidence)}</span>
                  </div>
                  <div className="text-sm">Confidence: {validationResult.fields.email.confidence}%</div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-1">Email Address</div>
                  <div className="text-base">{lead.email}</div>
                </div>

                {validationResult.fields.email.suggestion && (
                  <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                    <div className="text-sm font-medium mb-1 text-blue-800">Suggested Correction</div>
                    <div className="text-base text-blue-900">{validationResult.fields.email.suggestion}</div>
                  </div>
                )}

                {validationResult.fields.email.isDisposable && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Disposable Email Detected</span>
                    </div>
                    <p className="mt-1">This appears to be a temporary email address and may not be reliable for communication.</p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {validationResult.fields.email.isValid 
                    ? "This email address appears to be valid." 
                    : "This email address may not be valid or accurate."}
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(validationResult.fields.address.isValid, validationResult.fields.address.confidence)}
                    <span className="font-medium">{getStatusText(validationResult.fields.address.isValid, validationResult.fields.address.confidence)}</span>
                  </div>
                  <div className="text-sm">Confidence: {validationResult.fields.address.confidence}%</div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-1">Address</div>
                  <div className="text-base">{lead.address}</div>
                </div>

                {validationResult.fields.address.formatted && validationResult.fields.address.formatted !== lead.address && (
                  <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                    <div className="text-sm font-medium mb-1 text-blue-800">Formatted Address</div>
                    <div className="text-base text-blue-900">{validationResult.fields.address.formatted}</div>
                  </div>
                )}

                {validationResult.fields.address.components && (
                  <div className="rounded-lg border p-3 bg-gray-50">
                    <div className="text-sm font-medium mb-1">Address Components</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {validationResult.fields.address.components.street && (
                        <div>
                          <span className="font-medium">Street:</span> {validationResult.fields.address.components.street}
                        </div>
                      )}
                      {validationResult.fields.address.components.city && (
                        <div>
                          <span className="font-medium">City:</span> {validationResult.fields.address.components.city}
                        </div>
                      )}
                      {validationResult.fields.address.components.state && (
                        <div>
                          <span className="font-medium">State:</span> {validationResult.fields.address.components.state}
                        </div>
                      )}
                      {validationResult.fields.address.components.zipCode && (
                        <div>
                          <span className="font-medium">Zip Code:</span> {validationResult.fields.address.components.zipCode}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {validationResult.fields.address.isValid 
                    ? "This address appears to be valid." 
                    : "This address may not be valid or accurate."}
                </div>
              </TabsContent>

              {/* Job Title Tab */}
              <TabsContent value="job" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(validationResult.fields.jobTitle.isValid, validationResult.fields.jobTitle.confidence)}
                    <span className="font-medium">{getStatusText(validationResult.fields.jobTitle.isValid, validationResult.fields.jobTitle.confidence)}</span>
                  </div>
                  <div className="text-sm">Confidence: {validationResult.fields.jobTitle.confidence}%</div>
                </div>

                <div className="rounded-lg border p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-1">Job Title</div>
                  <div className="text-base">{lead.jobTitle}</div>
                </div>

                {validationResult.fields.jobTitle.standardized && validationResult.fields.jobTitle.standardized !== lead.jobTitle && (
                  <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                    <div className="text-sm font-medium mb-1 text-blue-800">Standardized Job Title</div>
                    <div className="text-base text-blue-900">{validationResult.fields.jobTitle.standardized}</div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {validationResult.fields.jobTitle.confidence >= 70 
                    ? "This job title appears to be valid." 
                    : "This job title may not be accurate or standardized."}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center p-6">
            <div className="text-lg font-medium mb-2">No Validation Data</div>
            <p className="text-gray-500 mb-6">
              Validate this lead to check the accuracy and quality of the data.
            </p>
            <Button onClick={handleValidate} disabled={isValidating}>
              {isValidating ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Validate Lead Data
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {validationResult && (
          <div className="text-xs text-gray-500">
            Validation ID: {validationResult.executionId} • {new Date(validationResult.timestamp).toLocaleString()}
          </div>
        )}
        {validationResult && (
          <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? (
              <>
                <RotateCw className="mr-2 h-3 w-3 animate-spin" />
                Revalidating...
              </>
            ) : (
              "Revalidate"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default DataValidationPanel;