import { useState, useEffect, useCallback } from 'react';
import { crewService, type CreateCrewData, type UpdateCrewData } from './crew.service';
import type { crewType } from './crew.type';
import { notifications } from '@mantine/notifications';

export const useCrewList = (includeArchived = false) => {
  const [crew, setCrew] = useState<crewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCrew = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await crewService.getAllCrew(includeArchived);
      setCrew(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch crew');
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch crew members',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchCrew();
  }, [includeArchived, fetchCrew]);

  return {
    crew,
    loading,
    error,
    refetch: fetchCrew
  };
};

export const useCrewById = (id: string | null) => {
  const [crewMember, setCrewMember] = useState<crewType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCrewMember = useCallback(async (crewId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await crewService.getCrewById(crewId);
      setCrewMember(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch crew member');
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch crew member',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCrewMember(id);
    } else {
      setCrewMember(null);
      setLoading(false);
    }
  }, [id, fetchCrewMember]);

  const refetch = useCallback(() => {
    return id ? fetchCrewMember(id) : Promise.resolve();
  }, [id, fetchCrewMember]);

  return {
    crewMember,
    loading,
    error,
    refetch
  };
};

export const useCrewMutations = () => {
  const [loading, setLoading] = useState(false);

  const createCrew = async (crewData: CreateCrewData): Promise<crewType> => {
    try {
      setLoading(true);
      const newCrew = await crewService.createCrew(crewData);
      notifications.show({
        title: 'Success',
        message: 'Crew member created successfully',
        color: 'green'
      });
      return newCrew;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create crew member';
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCrew = async (id: string, crewData: UpdateCrewData): Promise<crewType> => {
    try {
      setLoading(true);
      const updatedCrew = await crewService.updateCrew(id, crewData);
      notifications.show({
        title: 'Success',
        message: 'Crew member updated successfully',
        color: 'green'
      });
      return updatedCrew;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update crew member';
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const archiveCrew = async (id: string, updated_by: string): Promise<void> => {
    try {
      setLoading(true);
      await crewService.archiveCrew(id, updated_by);
      notifications.show({
        title: 'Success',
        message: 'Crew member archived successfully',
        color: 'green'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive crew member';
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unarchiveCrew = async (id: string, updated_by: string): Promise<void> => {
    try {
      setLoading(true);
      await crewService.unarchiveCrew(id, updated_by);
      notifications.show({
        title: 'Success',
        message: 'Crew member restored successfully',
        color: 'green'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore crew member';
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePicture = async (crewId: string, file: File): Promise<string> => {
    try {
      setLoading(true);
      const photoUrl = await crewService.uploadProfilePicture(crewId, file);
      notifications.show({
        title: 'Success',
        message: 'Profile picture uploaded successfully',
        color: 'green'
      });
      return photoUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload profile picture';
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteProfilePicture = async (crewId: string): Promise<void> => {
    try {
      setLoading(true);
      await crewService.deleteProfilePicture(crewId);
      notifications.show({
        title: 'Success',
        message: 'Profile picture removed successfully',
        color: 'green'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove profile picture';
      notifications.show({
        title: 'Error',
        message,
        color: 'red'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createCrew,
    updateCrew,
    archiveCrew,
    unarchiveCrew,
    uploadProfilePicture,
    deleteProfilePicture
  };
};

export const useCrewSearch = () => {
  const [searchResults, setSearchResults] = useState<crewType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCrew = async (searchTerm: string, includeArchived = false) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await crewService.searchCrew(searchTerm, includeArchived);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search crew');
      notifications.show({
        title: 'Error',
        message: 'Failed to search crew members',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
    setError(null);
  };

  return {
    searchResults,
    loading,
    error,
    searchCrew,
    clearSearch
  };
};
