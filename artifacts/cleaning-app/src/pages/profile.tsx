import { Layout } from "@/components/layout";
import { useGetProfile, useUpdateProfile, useGetTodayAssignments } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Calendar, MapPin, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number is too short."),
});

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const { data: assignments, isLoading: assignmentsLoading } = useGetTodayAssignments();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    },
    values: {
      name: profile?.name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    }
  });

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfile.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update profile.",
          variant: "destructive",
        });
      }
    });
  };

  if (profileLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <Avatar className="h-24 w-24 border-4 border-card shadow-sm">
            <AvatarImage src={profile?.avatarUrl || ""} alt={profile?.name} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {profile?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile?.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <Badge variant="secondary" className="font-medium text-xs rounded-full px-2.5 py-0.5">
                {profile?.role.toUpperCase()}
              </Badge>
              <span className="text-sm flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {profile?.companyName}
              </span>
              <span className="text-sm flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Started {profile?.startDate ? format(new Date(profile.startDate), 'MMM yyyy') : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
          
          {/* Edit Profile Form */}
          <Card className="border-border/50 shadow-sm h-fit">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Today's Assignments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Today's Assignments</h2>
              <Badge variant="outline" className="bg-background">
                {assignments?.length || 0} jobs
              </Badge>
            </div>

            {assignmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : assignments?.length === 0 ? (
              <Card className="border-dashed border-2 bg-background/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="bg-secondary p-3 rounded-full mb-4">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">No assignments for today.</p>
                  <p className="text-sm mt-1">Take a break or check back later.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments?.map((assignment) => (
                  <Card key={assignment.id} className="overflow-hidden hover:shadow-md transition-shadow group border-border/50">
                    <div className="flex">
                      <div className={cn(
                        "w-2 flex-shrink-0",
                        assignment.status === 'completed' ? "bg-green-500" :
                        assignment.status === 'in_progress' ? "bg-blue-500" :
                        "bg-amber-500"
                      )} />
                      <CardContent className="p-4 md:p-5 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg leading-none group-hover:text-primary transition-colors">
                              {assignment.houseName}
                            </h3>
                            {assignment.priority === 'high' && (
                              <Badge variant="destructive" className="h-5 px-1.5 py-0 text-[10px] uppercase">High Priority</Badge>
                            )}
                          </div>
                          <div className="flex items-center text-muted-foreground text-sm gap-1">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{assignment.houseAddress}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center md:items-end justify-between md:flex-col gap-3">
                          <div className="flex items-center text-sm font-medium gap-1.5 bg-secondary px-2.5 py-1 rounded-md text-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            {assignment.timeSlot}
                          </div>
                          <Badge variant="outline" className={cn(
                            "capitalize text-[11px]",
                            assignment.status === 'completed' && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950",
                            assignment.status === 'in_progress' && "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950",
                            assignment.status === 'pending' && "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950"
                          )}>
                            {assignment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </Layout>
  );
}