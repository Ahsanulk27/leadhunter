import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, AlertCircle, CheckCircle } from "lucide-react";
import axios from "axios";

interface PlacesApiStatus {
  total_calls_24h: number;
  successful_calls_24h: number;
  quota_limit: number;
  quota_used_percent: number;
  quota_remaining: number;
  latest_calls: {
    timestamp: string;
    endpoint: string;
    status: string;
  }[];
  has_key: boolean;
  timestamp: string;
}

export default function ApiStatusDashboard() {
  const [placesApiStatus, setPlacesApiStatus] = useState<PlacesApiStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/places-status');
        setPlacesApiStatus(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching API status:', err);
        setError(err.message || 'Failed to fetch API status');
        toast({
          title: "Error",
          description: "Failed to load API status information",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiStatus();
    
    // Refresh status every 5 minutes
    const interval = setInterval(fetchApiStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [toast]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!placesApiStatus) {
    return null;
  }

  const quotaColor = placesApiStatus.quota_used_percent > 90 
    ? "bg-red-500" 
    : placesApiStatus.quota_used_percent > 70 
      ? "bg-yellow-500" 
      : "bg-green-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Google Places API Status</span>
          {placesApiStatus.has_key ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" /> API Key Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <AlertCircle className="h-3 w-3 mr-1" /> API Key Missing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                API Quota Usage ({placesApiStatus.quota_used_percent.toFixed(1)}%)
              </span>
              <span className="text-xs text-gray-500">
                {placesApiStatus.total_calls_24h} / {placesApiStatus.quota_limit} calls in 24h
              </span>
            </div>
            <Progress
              value={placesApiStatus.quota_used_percent}
              className="h-2"
              indicatorClassName={quotaColor}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Total Calls (24h)</div>
              <div className="text-2xl font-bold">{placesApiStatus.total_calls_24h}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Success Rate</div>
              <div className="text-2xl font-bold">
                {placesApiStatus.total_calls_24h > 0 
                  ? ((placesApiStatus.successful_calls_24h / placesApiStatus.total_calls_24h) * 100).toFixed(1) 
                  : 0}%
              </div>
            </div>
          </div>
          
          {placesApiStatus.quota_used_percent > 80 && (
            <Alert variant="warning" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>High API Usage</AlertTitle>
              <AlertDescription>
                You've used {placesApiStatus.quota_used_percent.toFixed(1)}% of your Google Places API quota. 
                Consider limiting searches until the quota resets.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recent API Calls</h4>
            <div className="text-xs text-gray-500 border rounded-md divide-y">
              {placesApiStatus.latest_calls.slice(0, 5).map((call, index) => (
                <div key={index} className="flex items-center justify-between p-2">
                  <div className="flex items-center">
                    <span className="font-mono">{call.endpoint}</span>
                  </div>
                  <div className="flex items-center">
                    <Badge variant="outline" className={call.status === 'OK' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'}>
                      {call.status}
                    </Badge>
                    <span className="ml-2 text-gray-400">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {placesApiStatus.latest_calls.length === 0 && (
                <div className="p-2 text-center text-gray-400">No recent API calls</div>
              )}
            </div>
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            Last updated: {new Date(placesApiStatus.timestamp).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}