export const formatDate = (date) => {
  if (!date) return "TBA";

  const dateObject = new Date(`${date}T00:00:00`);
  if (isNaN(dateObject.getTime())) {
    return "Invalid Date";
  }
  const optionsDate = { month: "numeric", day: "numeric", year: "numeric" };
  return dateObject.toLocaleDateString(undefined, optionsDate);
};

export const formatDateTime = (date, time) => {
  if (!date || !time) return "TBA";

  const dateObject = new Date(`${date}T${time}`);
  if (isNaN(dateObject.getTime())) {
    return "Invalid Date";
  }
  const optionsDate = { month: "numeric", day: "numeric", year: "numeric" };
  const optionsTime = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZoneName: "short",
  };
  const formattedDate = dateObject.toLocaleDateString(undefined, optionsDate);
  const formattedTime = dateObject.toLocaleTimeString(undefined, optionsTime);

  const formattedTimeCapitalized = formattedTime
    .replace("am", "AM")
    .replace("pm", "PM");
  return `${formattedDate} ${formattedTimeCapitalized}`;
};
