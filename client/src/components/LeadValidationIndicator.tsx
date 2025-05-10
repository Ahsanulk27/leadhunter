import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  fields: {
    name: { isValid: boolean; confidence: number; };
    phoneNumber: { isValid: boolean; confidence: number; };
    email: { isValid: boolean; confidence: number; isDisposable?: boolean; };
    address: { isValid: boolean; confidence: number; };
    jobTitle: { isValid: boolean; confidence: number; };
  };
  warnings: string[];
}

interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  jobTitle: string;
  [key: string]: any;
}

interface LeadValidationIndicatorProps {
  lead: Lead;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showStatus?: boolean;
}

const LeadValidationIndicator: React.FC<LeadValidationIndicatorProps> = ({
  lead,
  size = 'md',
  showScore = true,
  showStatus = true
}) => {
  const [validationState, setValidationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);

  // Icon sizes based on the size prop
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Text sizes based on the size prop
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Define badge colors based on validation status
  const getBadgeVariant = (score: number) => {
    if (score >= 90) return "success";
    if (score >= 75) return "default";
    if (score >= 50) return "warning";
    return "destructive";
  };

  // Function to validate the lead
  const validateLead = async () => {
    if (!lead || validationState === 'loading') return;
    
    try {
      setValidationState('loading');
      
      const response = await axios.post('/api/validate/lead', {
        id: lead.id,
        name: lead.name,
        phoneNumber: lead.phoneNumber,
        email: lead.email,
        address: lead.address,
        jobTitle: lead.jobTitle
      });
      
      if (response.data.success) {
        setValidationResult(response.data.validation);
        setValidationState('success');
      } else {
        setValidationState('error');
      }
    } catch (error) {
      console.error('Error validating lead:', error);
      setValidationState('error');
    } finally {
      setHasAttemptedValidation(true);
    }
  };

  // Get validation status icon
  const getStatusIcon = () => {
    if (validationState === 'loading') {
      return <Loader2 className={`${iconSizes[size]} animate-spin text-muted-foreground`} />;
    }
    
    if (validationState === 'error') {
      return <XCircle className={`${iconSizes[size]} text-destructive`} />;
    }
    
    if (!validationResult) {
      return <AlertTriangle className={`${iconSizes[size]} text-muted-foreground`} />;
    }
    
    if (validationResult.isValid) {
      return <CheckCircle className={`${iconSizes[size]} text-success`} />;
    }
    
    return <AlertTriangle className={`${iconSizes[size]} text-warning`} />;
  };

  // Get tooltip content based on validation result
  const getTooltipContent = () => {
    if (validationState === 'loading') {
      return 'Validating lead...';
    }
    
    if (validationState === 'error') {
      return 'Error validating lead';
    }
    
    if (!validationResult) {
      return hasAttemptedValidation ? 'Unable to validate lead' : 'Lead not validated';
    }
    
    if (validationResult.warnings.length > 0) {
      return (
        <div className="space-y-1 max-w-xs">
          <p className="font-medium">Validation Warnings:</p>
          <ul className="list-disc pl-4 space-y-1">
            {validationResult.warnings.map((warning, index) => (
              <li key={index} className="text-xs">{warning}</li>
            ))}
          </ul>
        </div>
      );
    }
    
    return 'Lead data is valid';
  };

  // Validate the lead on component mount
  useEffect(() => {
    if (lead && !hasAttemptedValidation) {
      validateLead();
    }
  }, [lead]);

  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="cursor-help"
              onClick={(e) => {
                e.stopPropagation();
                if (validationState !== 'loading' && (!validationResult || validationState === 'error')) {
                  validateLead();
                }
              }}
            >
              {getStatusIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showScore && validationResult && (
        <Badge 
          variant={getBadgeVariant(validationResult.confidenceScore)}
          className={`${textSizes[size]}`}
        >
          {validationResult.confidenceScore}%
        </Badge>
      )}
      
      {showStatus && validationResult && (
        <span className={`${textSizes[size]} text-muted-foreground`}>
          {validationResult.isValid ? 'Valid' : 'Review'}
        </span>
      )}
    </div>
  );
};

export default LeadValidationIndicator;