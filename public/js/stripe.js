/* eslint-disable */
import axios from "axios";
import { showAlert } from "./alerts";

const stripe = Stripe(
  "pk_test_51HDmBHGTdcJEqUCbNcTsEsnZGpHfu9riQmsm8tvrQ0H0wkZYK7YkPL7sybXwDszDgTLqu9ajP1kVChSCcLe89goY00jQlyALEf"
);

export const bookTour = async (tourId) => {
  try {
    // Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    // Create checkout form and charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert("error", err);
  }
};
