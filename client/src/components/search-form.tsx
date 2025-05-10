import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal } from "lucide-react";

interface SearchFormProps {
  onSearch: (data: any) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const { register, handleSubmit, watch, setValue, formState } = useForm({
    defaultValues: {
      company: "",
      industry: "",
      location: "",
      position: "",
      size: "",
      prioritizeDecisionMakers: true,
    }
  });
  
  const watchPrioritizeDecisionMakers = watch("prioritizeDecisionMakers");

  const handleFormSubmit = (data: any) => {
    onSearch(data);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Find B2B Leads</h2>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </Label>
              <Input
                id="company"
                placeholder="e.g. Acme Corporation"
                {...register("company", { required: true })}
                className={formState.errors.company ? "border-red-500" : ""}
              />
              {formState.errors.company && (
                <p className="mt-1 text-xs text-red-500">Company name is required</p>
              )}
            </div>
            <div className="col-span-1">
              <Label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Industry (Optional)
              </Label>
              <Select
                onValueChange={(value) => setValue("industry", value)}
                defaultValue=""
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="col-span-1">
                <Label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Optional)
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, CA"
                  {...register("location")}
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Position (Optional)
                </Label>
                <Input
                  id="position"
                  placeholder="e.g. Sales Manager"
                  {...register("position")}
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size (Optional)
                </Label>
                <Select
                  onValueChange={(value) => setValue("size", value)}
                  defaultValue=""
                >
                  <SelectTrigger id="size">
                    <SelectValue placeholder="Any Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Size</SelectItem>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501+">501+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <Checkbox
                id="prioritize"
                checked={watchPrioritizeDecisionMakers}
                onCheckedChange={(checked) => setValue("prioritizeDecisionMakers", checked === true)}
              />
              <Label htmlFor="prioritize" className="ml-2 block text-sm text-gray-700">
                Prioritize decision makers
              </Label>
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showAdvancedFilters ? "Hide Filters" : "Advanced Filters"}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find Leads
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
