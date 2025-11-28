# Quick Testing Guide

## 🧪 How to Test the Implementation

### Prerequisites
- Backend running on http://localhost:5000
- Frontend running on http://localhost:5173
- MongoDB connected

---

## Test Scenario 1: Driver Portal

### Step 1: Create a Driver Account
1. Register as a driver or use existing driver credentials
2. Login with driver role

### Step 2: Verify Dashboard
✅ **Expected**: You should see a card showing your assigned vehicle with:
- Vehicle registration number
- Make and model
- Vehicle type
- Fuel type

### Step 3: Test Trip Logging
1. Go to "Trips" page
2. Click "Log Trip" button
3. ✅ **Expected**: Vehicle should be pre-selected
4. Fill in trip details:
   - Start location: "Mumbai"
   - End location: "Pune"
   - Start mileage: 10000
   - End mileage: 10150
   - Trip date: Today
   - Fuel consumed: 10
   - Trip purpose: "Delivery"
5. Submit the trip
6. ✅ **Expected**: Trip appears in the list

### Step 4: Test Expense Logging
1. Go to "Expenses" page
2. Click "Add Expense"
3. ✅ **Expected**: Vehicle should be pre-selected
4. Fill in expense details:
   - Category: Fuel
   - Amount: 1500
   - Description: "Fuel refill at highway"
   - Upload a bill photo (any image)
5. Submit the expense
6. ✅ **Expected**: Expense appears in the list

### Step 5: Verify Reminders
1. Go to "Service Reminders" page
2. ✅ **Expected**: See reminders only for YOUR assigned vehicle
   - Service due dates
   - Insurance expiry
   - Permit expiry

---

## Test Scenario 2: Fleet Owner Portal

### Step 1: Login as Fleet Owner
1. Use fleet owner credentials
2. Login

### Step 2: Verify Trips Page
1. Go to "Trips" page
2. ✅ **Expected**: See the trip logged by the driver
3. ✅ **Expected**: Trip card should show:
   - Vehicle number
   - **Driver name** (the driver who logged it)
   - Trip date
   - Distance

### Step 3: Test Trip Filters
1. Try filtering by date
2. Try searching by driver name
3. Try searching by vehicle number
4. ✅ **Expected**: Filter count updates dynamically
5. ✅ **Expected**: Only matching trips are displayed

### Step 4: Verify Expenses Page
1. Go to "Expenses" page
2. ✅ **Expected**: See the expense logged by the driver
3. ✅ **Expected**: Expense card should show:
   - Vehicle number
   - **Driver name** (who logged it)
   - Amount
   - Category
   - **Bill photo** (if uploaded)
4. Click on the bill photo
5. ✅ **Expected**: Image opens in new tab

### Step 5: Test Expense Filters
1. Try filtering by category (Fuel, Maintenance, etc.)
2. ✅ **Expected**: Only expenses of that category are shown

---

## Test Scenario 3: Real-time Updates

### Setup: Have Two Browser Windows Open
- Window 1: Logged in as **Driver**
- Window 2: Logged in as **Fleet Owner**

### Test Trip Real-time Update
1. In Driver window: Log a new trip
2. In Fleet Owner window: Refresh the Trips page
3. ✅ **Expected**: New trip appears with driver's name

### Test Expense Real-time Update
1. In Driver window: Log a new expense with bill photo
2. In Fleet Owner window: Refresh the Expenses page
3. ✅ **Expected**: New expense appears with driver's name and bill photo

---

## Common Issues & Solutions

### Issue: "No vehicle assigned" message
**Solution**: Make sure the driver has been assigned a vehicle in the Driver Management page

### Issue: Receipt image not displaying
**Solution**: 
1. Check that `backend/uploads/` directory exists
2. Verify backend is serving static files from `/uploads`
3. Check browser console for 404 errors

### Issue: Driver name shows as "Unknown"
**Solution**: 
1. Check that the trip/expense has a valid driverId
2. Verify the Driver model has userId populated
3. Check backend is doing nested populate correctly

### Issue: Filters not working
**Solution**:
1. Clear all filters and try again
2. Check browser console for errors
3. Verify data format matches filter expectations

---

## API Testing with Postman/Thunder Client

### Get Driver's Assigned Vehicle
```
GET http://localhost:5000/api/drivers/me/vehicle
Headers: Authorization: Bearer <driver_token>
```

### Create Trip (Driver)
```
POST http://localhost:5000/api/trips
Headers: 
  Authorization: Bearer <driver_token>
  Content-Type: application/json
Body:
{
  "vehicleId": "vehicle_id_here",
  "startLocation": "Mumbai",
  "endLocation": "Pune",
  "startMileage": 10000,
  "endMileage": 10150,
  "tripDate": "2025-11-27",
  "fuelConsumed": 10,
  "purpose": "Delivery"
}
```

### Create Expense with Receipt (Driver)
```
POST http://localhost:5000/api/expenses
Headers: 
  Authorization: Bearer <driver_token>
  Content-Type: multipart/form-data
Body (form-data):
  vehicleId: vehicle_id_here
  type: fuel
  amount: 1500
  description: Fuel refill
  date: 2025-11-27
  receipt: [upload image file]
```

### Get All Trips (Fleet Owner)
```
GET http://localhost:5000/api/trips
Headers: Authorization: Bearer <owner_token>
```

### Get All Expenses (Fleet Owner)
```
GET http://localhost:5000/api/expenses
Headers: Authorization: Bearer <owner_token>
```

---

## Success Criteria

### ✅ Driver Portal
- [ ] Dashboard shows assigned vehicle automatically
- [ ] Can log trips with pre-filled vehicle
- [ ] Can log expenses with pre-filled vehicle
- [ ] Can upload bill photos
- [ ] Reminders show only for assigned vehicle

### ✅ Fleet Owner Portal
- [ ] Trips page shows all driver trips
- [ ] Each trip displays driver name
- [ ] Can filter trips by date, driver, vehicle
- [ ] Expenses page shows all driver expenses
- [ ] Each expense displays driver name
- [ ] Can view uploaded bill photos
- [ ] Can filter expenses by category

### ✅ Integration
- [ ] Driver's trips appear in owner's dashboard
- [ ] Driver's expenses appear in owner's dashboard
- [ ] Driver names are correctly displayed
- [ ] Vehicle details are correctly displayed
- [ ] Filters work correctly
- [ ] File uploads work correctly

---

## 📸 Screenshots to Verify

1. **Driver Dashboard**: Assigned vehicle card
2. **Driver Trip Form**: Pre-selected vehicle
3. **Driver Expense Form**: File upload field
4. **Fleet Owner Trips**: Driver name displayed
5. **Fleet Owner Trips**: Filter UI
6. **Fleet Owner Expenses**: Driver name and receipt image
7. **Fleet Owner Expenses**: Category filter

---

## Need Help?

If something isn't working:
1. Check browser console for errors
2. Check backend terminal for errors
3. Verify MongoDB is connected
4. Ensure all dependencies are installed
5. Restart both frontend and backend servers
