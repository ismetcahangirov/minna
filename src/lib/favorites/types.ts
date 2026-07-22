/**
 * A favorited anime as shown on the Favorites listing (LIST-04). The fields are
 * denormalized onto the `favorites` row at save time, so the listing renders
 * without a Consumet round-trip. `createdAt` is an ISO string (not a `Date`) so
 * the SSR-seeded first page and the JSON pagination API share one serializable
 * shape across the server/client boundary.
 */
export interface FavoriteItem {
  animeId: string;
  title: string;
  image: string | null;
  createdAt: string;
}
