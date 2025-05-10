import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Verification result interface
interface VerificationResult {
  isVerified: boolean;
  confidenceScore: number; // 0-100
  method: string;
  timestamp: string;
  details?: {
    phoneValid?: boolean;
    emailValid?: boolean;
    addressValid?: boolean;
    identityMatch?: boolean;
    deviceIdMatch?: boolean;
    blacklistStatus?: 'clean' | 'suspicious' | 'blacklisted';
    ipReputation?: 'good' | 'moderate' | 'poor';
    fraudScore?: number; // 0-100, higher means more likely to be fraud
  };
  warnings?: string[];
  executionId: string;
}

interface LeadVerificationPanelProps {
  leadId?: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadAddress: string;
  onVerified?: (result: VerificationResult) => void;
  initialVerification?: VerificationResult;
  isVerifying?: boolean;
}

const LeadVerificationPanel: React.FC<LeadVerificationPanelProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  leadAddress,
  onVerified,
  initialVerification,
  isVerifying: externalIsVerifying
}) => {
  const [verification, setVerification] = useState<VerificationResult | null>(initialVerification || null);
  const [isVerifying, setIsVerifying] = useState<boolean>(externalIsVerifying || false);
  const { toast } = useToast();

  // Function to verify the lead
  const verifyLead = async () => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setVerification(null);
    
    try {
      // In a real implementation, this would call the API
      // For now, simulate a verification response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a randomized but mostly positive verification result
      // In a real implementation, this would come from the server
      const confidenceScore = Math.floor(Math.random() * 30) + 70; // 70-99
      const fraudScore = 100 - confidenceScore;
      
      const result: VerificationResult = {
        isVerified: confidenceScore >= 70,
        confidenceScore,
        method: 'api',
        timestamp: new Date().toISOString(),
        details: {
          phoneValid: Math.random() > 0.1, // 90% chance of being valid
          emailValid: Math.random() > 0.1, // 90% chance of being valid
          addressValid: Math.random() > 0.2, // 80% chance of being valid
          identityMatch: Math.random() > 0.2, // 80% chance of matching
          blacklistStatus: 'clean',
          ipReputation: 'good',
          fraudScore
        },
        executionId: `sim-${Date.now()}`
      };
      
      // Add warnings if score is lower
      if (confidenceScore < 80) {
        result.warnings = [];
        
        if (!result.details?.phoneValid) {
          result.warnings.push('Phone number could not be verified');
        }
        
        if (!result.details?.emailValid) {
          result.warnings.push('Email address could not be verified');
        }
        
        if (!result.details?.addressValid) {
          result.warnings.push('Address validation failed');
        }
        
        if (!result.details?.identityMatch) {
          result.warnings.push('Identity information did not match records');
        }
        
        if (result.details && result.details.fraudScore !== undefined && result.details.fraudScore > 25) {
          result.details.blacklistStatus = 'suspicious';
          result.details.ipReputation = 'moderate';
        }
      }
      
      setVerification(result);
      
      if (onVerified) {
        onVerified(result);
      }
      
      toast({
        title: result.isVerified ? "Verification Successful" : "Verification Issues Detected",
        description: result.isVerified 
          ? "Lead has been verified successfully." 
          : "There are some issues with this lead. Check the details.",
        variant: result.isVerified ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error verifying lead:', error);
      
      toast({
        title: "Verification Failed",
        description: "There was an error verifying this lead. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lead Verification</span>
          {verification && (
            <Badge
              variant={verification.isVerified ? "outline" : "destructive"}
              className={`ml-2 ${verification.isVerified ? "bg-green-50 text-green-700 border-green-200" : ""}`}
            >
              {verification.isVerified ? "Verified" : "Unverified"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Verify that this lead is legitimate and the contact information is accurate
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isVerifying ? (
          <div className="space-y-4 py-4">
            <div className="text-center text-sm text-muted-foreground">
              Verifying lead information...
            </div>
            <Progress value={60} className="w-full" />
          </div>
        ) : verification ? (
          <div className="space-y-4">
            {/* Verification Score */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium">Confidence Score</div>
                <div className="text-sm text-muted-foreground">
                  Overall verification confidence
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "text-lg font-bold",
                    verification.confidenceScore >= 80 ? "text-green-600" :
                    verification.confidenceScore >= 60 ? "text-yellow-600" :
                    "text-red-600"
                  )}
                >
                  {verification.confidenceScore}%
                </div>
                <Progress 
                  value={verification.confidenceScore} 
                  className={cn(
                    "w-24",
                    verification.confidenceScore >= 80 ? "bg-green-100" :
                    verification.confidenceScore >= 60 ? "bg-yellow-100" :
                    "bg-red-100"
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Verification Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Contact Method</div>
                <div className="flex items-center">
                  {verification.details?.emailValid ? (
                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Email</span>
                </div>
                <div className="flex items-center">
                  {verification.details?.phoneValid ? (
                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Phone</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">Location & Identity</div>
                <div className="flex items-center">
                  {verification.details?.addressValid ? (
                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Address</span>
                </div>
                <div className="flex items-center">
                  {verification.details?.identityMatch ? (
                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">Identity Match</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Risk Assessment */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Risk Assessment</div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {verification.details?.blacklistStatus === 'clean' ? (
                    <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                  ) : verification.details?.blacklistStatus === 'suspicious' ? (
                    <ShieldAlert className="mr-2 h-5 w-5 text-yellow-500" />
                  ) : (
                    <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <div className="text-sm">Blacklist Status</div>
                    <div className="text-xs text-muted-foreground">
                      {verification.details?.blacklistStatus === 'clean' ? 'Clean record' :
                       verification.details?.blacklistStatus === 'suspicious' ? 'Potentially suspicious' :
                       'Blacklisted'}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={verification.details?.blacklistStatus === 'clean' ? "outline" :
                          verification.details?.blacklistStatus === 'suspicious' ? "secondary" :
                          "destructive"}
                >
                  {verification.details?.blacklistStatus}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {verification.details?.fraudScore !== undefined && (
                    <>
                      {verification.details.fraudScore < 20 ? (
                        <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                      ) : verification.details.fraudScore < 50 ? (
                        <ShieldAlert className="mr-2 h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
                      )}
                    </>
                  )}
                  <div>
                    <div className="text-sm">Fraud Risk</div>
                    <div className="text-xs text-muted-foreground">
                      Likelihood of fraudulent information
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      verification.details?.fraudScore !== undefined && (
                        verification.details.fraudScore < 20 ? "text-green-600" :
                        verification.details.fraudScore < 50 ? "text-yellow-600" :
                        "text-red-600"
                      )
                    )}
                  >
                    {verification.details?.fraudScore !== undefined ? `${verification.details.fraudScore}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Warnings if any */}
            {verification.warnings && verification.warnings.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Verification Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    {verification.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-xs text-muted-foreground pt-2">
              Verified on {new Date(verification.timestamp).toLocaleString()} via {verification.method} method
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-2 text-sm text-muted-foreground">
              This lead has not been verified yet. Click the button below to verify.
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={verifyLead} 
          disabled={isVerifying}
          className="w-full"
          variant={verification ? "outline" : "default"}
        >
          {isVerifying ? "Verifying..." : verification ? "Re-verify Lead" : "Verify Lead"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LeadVerificationPanel;