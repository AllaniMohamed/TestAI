from abc import ABC, abstractmethod

class BaseGenerator(ABC):
    @abstractmethod
    def generate(self, endpoint):
        """Return a list of test results for the given endpoint."""
        pass