"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

const addressSchema = z.object({
  label: z.string().default("Home"),
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  line1: z.string().min(5, "Required"),
  line2: z.string().optional(),
  city: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  defaultValues?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function AddressForm({ defaultValues, onSubmit, onCancel, loading }: AddressFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { label: "Home", isDefault: false, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Label */}
      <div className="flex gap-2">
        {["Home", "Work", "Other"].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setValue("label", l)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              defaultValues?.label === l
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/40"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register("firstName")} placeholder="Rahul" />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...register("lastName")} placeholder="Sharma" />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="flex gap-2">
          <span className="flex h-9 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
            +91
          </span>
          <Input id="phone" {...register("phone")} placeholder="9876543210" className="flex-1" />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="line1">Address Line 1</Label>
        <Input id="line1" {...register("line1")} placeholder="House / Flat No., Street" />
        {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="line2">Address Line 2 (Optional)</Label>
        <Input id="line2" {...register("line2")} placeholder="Area, Landmark" />
      </div>

      {/* City / State / Pincode */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} placeholder="Mumbai" />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select onValueChange={(v) => setValue("state", v)} defaultValue={defaultValues?.state}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" {...register("pincode")} placeholder="400001" maxLength={6} />
          {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1 gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Address
        </Button>
      </div>
    </form>
  );
}
