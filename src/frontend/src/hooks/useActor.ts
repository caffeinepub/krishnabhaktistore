import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated =
        !!identity && !identity.getPrincipal().isAnonymous();

      if (!isAuthenticated) {
        // Return anonymous actor -- no _initializeAccessControlWithSecret needed
        return await createActorWithConfig();
      }

      const actorOptions = {
        agentOptions: {
          identity,
        },
      };

      const actor = await createActorWithConfig(actorOptions);

      // Only call _initializeAccessControlWithSecret for Internet Identity users
      try {
        const adminToken = getSecretParameter("caffeineAdminToken") || "";
        await actor._initializeAccessControlWithSecret(adminToken);
      } catch (err) {
        // Non-fatal: if this fails the actor is still usable for public endpoints
        console.warn(
          "[useActor] _initializeAccessControlWithSecret failed:",
          err,
        );
      }

      return actor;
    },
    // Only refetch when identity changes
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When the actor changes, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
