ALTER TABLE "UserLocation"
ADD COLUMN "location" geography(Point, 4326);

CREATE INDEX "UserLocation_location_gist_idx"
ON "UserLocation"
USING GIST ("location");